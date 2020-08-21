/*
 Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category scene-graph
 */

import { ccclass, property, type } from '../data/class-decorator';
import { Mat3, Mat4, Quat, Size, Vec2, Vec3 } from '../math';
import { SystemEventType } from '../platform/event-manager/event-enum';
import { eventManager } from '../platform/event-manager/event-manager';
import { BaseNode, TRANSFORM_ON } from './base-node';
import { Layers } from './layers';
import { NodeSpace, TransformBit } from './node-enum';
import { NodeUIProperties } from './node-ui-properties';
import { legacyCC } from '../global-exports';

const v3_a = new Vec3();
const q_a = new Quat();
const q_b = new Quat();
const array_a = new Array(10);
const qt_1 = new Quat();
const m3_1 = new Mat3();
const m3_scaling = new Mat3();
const m4_1 = new Mat4();
const bookOfChange = new Map<string, number>();

/**
 * @zh
 * 场景树中的基本节点，基本特性有：
 * * 具有层级关系
 * * 持有各类组件
 * * 维护空间变换（坐标、旋转、缩放）信息
 */

/**
 * !#en
 * Class of all entities in Cocos Creator scenes.
 * Basic functionalities include:
 * * Hierarchy management with parent and children
 * * Components management
 * * Coordinate system with position, scale, rotation in 3d space
 * !#zh
 * Cocos Creator 场景中的所有节点类。
 * 基本特性有：
 * * 具有层级关系
 * * 持有各类组件
 * * 维护 3D 空间左边变换（坐标、旋转、缩放）信息
 */
@ccclass('cc.Node')
export class Node extends BaseNode {
    public static bookOfChange = bookOfChange;

    /**
     * @en Event types emitted by Node
     * @zh 节点可能发出的事件类型
     */
    public static EventType = SystemEventType;
    /**
     * @en Coordinates space
     * @zh 空间变换操作的坐标系
     */
    public static NodeSpace = NodeSpace;
    /**
     * @en Bit masks for Node transformation parts
     * @zh 节点变换更新的具体部分
     * @deprecated please use [[Node.TransformBit]]
     */
    public static TransformDirtyBit = TransformBit;
    /**
     * @en Bit masks for Node transformation parts, can be used to determine which part changed in [[SystemEventType.TRANSFORM_CHANGED]] event
     * @zh 节点变换更新的具体部分，可用于判断 [[SystemEventType.TRANSFORM_CHANGED]] 事件的具体类型
     */
    public static TransformBit = TransformBit;

    /**
     * @en Determine whether the given object is a normal Node. Will return false if [[Scene]] given.
     * @zh 指定对象是否是普通的节点？如果传入 [[Scene]] 会返回 false。
     */
    public static isNode (obj: object | null): obj is Node {
        return obj instanceof Node && (obj.constructor === Node || !(obj instanceof legacyCC.Scene));
    }

    // UI 部分的脏数据
    public _uiProps = new NodeUIProperties(this);
    public _static = false;

    // world transform, don't access this directly
    protected _pos = new Vec3();
    protected _rot = new Quat();
    protected _scale = new Vec3(1, 1, 1);
    protected _mat = new Mat4();

    // local transform
    @property
    protected _lpos = new Vec3();
    @property
    protected _lrot = new Quat();
    @property
    protected _lscale = new Vec3(1, 1, 1);
    @property
    protected _layer = Layers.Enum.DEFAULT; // the layer this node belongs to

    // local rotation in euler angles, maintained here so that rotation angles could be greater than 360 degree.
    @property
    protected _euler = new Vec3();

    protected _dirtyFlags = TransformBit.NONE; // does the world transform need to update?
    protected _eulerDirty = false;

    /**
     * @en Position in local coordinate system
     * @zh 本地坐标系下的坐标
     */
    // @constget
    public get position (): Readonly<Vec3> {
        return this._lpos;
    }
    public set position (val: Readonly<Vec3>) {
        this.setPosition(val);
    }

    /**
     * @en Position in world coordinate system
     * @zh 世界坐标系下的坐标
     */
    // @constget
    public get worldPosition (): Readonly<Vec3> {
        this.updateWorldTransform();
        return this._pos;
    }
    public set worldPosition (val: Readonly<Vec3>) {
        this.setWorldPosition(val);
    }

    /**
     * @en Rotation in local coordinate system, represented by a quaternion
     * @zh 本地坐标系下的旋转，用四元数表示
     */
    // @constget
    public get rotation (): Readonly<Quat> {
        return this._lrot;
    }
    public set rotation (val: Readonly<Quat>) {
        this.setRotation(val);
    }

    /**
     * @en Rotation in local coordinate system, represented by euler angles
     * @zh 本地坐标系下的旋转，用欧拉角表示
     */
    @type(Vec3)
    set eulerAngles (val: Readonly<Vec3>) {
        this.setRotationFromEuler(val.x, val.y, val.z);
    }
    get eulerAngles () {
        if (this._eulerDirty) {
            Quat.toEuler(this._euler, this._lrot);
            this._eulerDirty = false;
        }
        return this._euler;
    }

    /**
     * @en Rotation in world coordinate system, represented by a quaternion
     * @zh 世界坐标系下的旋转，用四元数表示
     */
    // @constget
    public get worldRotation (): Readonly<Quat> {
        this.updateWorldTransform();
        return this._rot;
    }
    public set worldRotation (val: Readonly<Quat>) {
        this.setWorldRotation(val);
    }

    /**
     * @en Scale in local coordinate system
     * @zh 本地坐标系下的缩放
     */
    // @constget
    public get scale (): Readonly<Vec3> {
        return this._lscale;
    }
    public set scale (val: Readonly<Vec3>) {
        this.setScale(val);
    }

    /**
     * @en Scale in world coordinate system
     * @zh 世界坐标系下的缩放
     */
    // @constget
    public get worldScale (): Readonly<Vec3> {
        this.updateWorldTransform();
        return this._scale;
    }
    public set worldScale (val: Readonly<Vec3>) {
        this.setWorldScale(val);
    }

    /**
     * @en Local transformation matrix
     * @zh 本地坐标系变换矩阵
     */
    public set matrix (val: Readonly<Mat4>) {
        Mat4.toRTS(val, this._lrot, this._lpos, this._lscale);
        this.invalidateChildren(TransformBit.TRS);
        this._eulerDirty = true;
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.TRS);
        }
    }

    /**
     * @en World transformation matrix
     * @zh 世界坐标系变换矩阵
     */
    // @constget
    public get worldMatrix (): Readonly<Mat4> {
        this.updateWorldTransform();
        return this._mat;
    }

    /**
     * @en The vector representing forward direction in local coordinate system, it's the minus z direction by default
     * @zh 当前节点面向的前方方向，默认前方为 -z 方向
     */
    get forward (): Vec3 {
        return Vec3.transformQuat(new Vec3(), Vec3.FORWARD, this.worldRotation);
    }
    set forward (dir: Vec3) {
        const len = dir.length();
        Vec3.multiplyScalar(v3_a, dir, -1 / len);
        Quat.fromViewUp(q_a, v3_a);
        this.setWorldRotation(q_a);
    }

    /**
     * @en Layer of the current Node, it affects raycast, physics etc, refer to [[Layers]]
     * @zh 节点所属层，主要影响射线检测、物理碰撞等，参考 [[Layers]]
     */
    @property
    set layer (l) {
        this._layer = l;
    }
    get layer () {
        return this._layer;
    }

    /**
     * @en Whether the node's transformation have changed during the current frame.
     * @zh 这个节点的空间变换信息在当前帧内是否有变过？
     */
    get hasChangedFlags () {
        return bookOfChange.get(this._id) || 0;
    }
    set hasChangedFlags (val: number) {
        bookOfChange.set(this._id, val);
    }

    // ===============================
    // hierarchy
    // ===============================

    /**
     * @en Set parent of the node.
     * @zh 设置该节点的父节点。
     * @param value Parent node
     * @param keepWorldTransform Whether keep node's current world transform unchanged after this operation
     */
    public setParent (value: this | null, keepWorldTransform: boolean = false) {
        if (keepWorldTransform) { this.updateWorldTransform(); }
        super.setParent(value, keepWorldTransform);
    }

    public _onSetParent (oldParent: this | null, keepWorldTransform: boolean) {
        super._onSetParent(oldParent, keepWorldTransform);
        if (keepWorldTransform) {
            const parent = this._parent;
            if (parent) {
                parent.updateWorldTransform();
                Mat4.multiply(m4_1, Mat4.invert(m4_1, parent._mat), this._mat);
                Mat4.toRTS(m4_1, this._lrot, this._lpos, this._lscale);
            } else {
                Vec3.copy(this._lpos, this._pos);
                Quat.copy(this._lrot, this._rot);
                Vec3.copy(this._lscale, this._scale);
            }
            this._eulerDirty = true;
        }

        this.invalidateChildren(TransformBit.TRS);
    }

    public _onBatchCreated () {
        super._onBatchCreated();
        bookOfChange.set(this._id, TransformBit.TRS);
        this._dirtyFlags = TransformBit.TRS;
        const len = this._children.length;
        for (let i = 0; i < len; ++i) {
            this._children[i]._onBatchCreated();
        }
    }

    public _onBatchRestored () {
        this._onBatchCreated();
    }

    public _onBeforeSerialize () {
        // tslint:disable-next-line: no-unused-expression
        this.eulerAngles; // make sure we save the correct eulerAngles
    }

    public _onPostActivated (active: boolean) {
        if (active) { // activated
            eventManager.resumeTarget(this);
            this.eventProcessor.reattach();
            // in case transform updated during deactivated period
            this.invalidateChildren(TransformBit.TRS);
        } else { // deactivated
            eventManager.pauseTarget(this);
        }
    }

    // ===============================
    // transform helper, convenient but not the most efficient
    // ===============================

    /**
     * @en Perform a translation on the node
     * @zh 移动节点
     * @param trans The increment on position
     * @param ns The operation coordinate space
     */
    public translate (trans: Vec3, ns?: NodeSpace): void {
        const space = ns || NodeSpace.LOCAL;
        if (space === NodeSpace.LOCAL) {
            Vec3.transformQuat(v3_a, trans, this._lrot);
            this._lpos.x += v3_a.x;
            this._lpos.y += v3_a.y;
            this._lpos.z += v3_a.z;
        } else if (space === NodeSpace.WORLD) {
            if (this._parent) {
                Quat.invert(q_a, this._parent.worldRotation);
                Vec3.transformQuat(v3_a, trans, q_a);
                const scale = this.worldScale;
                this._lpos.x += v3_a.x / scale.x;
                this._lpos.y += v3_a.y / scale.y;
                this._lpos.z += v3_a.z / scale.z;
            } else {
                this._lpos.x += trans.x;
                this._lpos.y += trans.y;
                this._lpos.z += trans.z;
            }
        }

        this.invalidateChildren(TransformBit.POSITION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
        }
    }

    /**
     * @en Perform a rotation on the node
     * @zh 旋转节点
     * @param trans The increment on position
     * @param ns The operation coordinate space
     */
    public rotate (rot: Quat, ns?: NodeSpace): void {
        const space = ns || NodeSpace.LOCAL;
        Quat.normalize(q_a, rot);

        if (space === NodeSpace.LOCAL) {
            Quat.multiply(this._lrot, this._lrot, q_a);
        } else if (space === NodeSpace.WORLD) {
            const worldRot = this.worldRotation;
            Quat.multiply(q_b, q_a, worldRot);
            Quat.invert(q_a, worldRot);
            Quat.multiply(q_b, q_a, q_b);
            Quat.multiply(this._lrot, this._lrot, q_b);
        }
        this._eulerDirty = true;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Set the orientation of the node to face the target position, the node is facing minus z direction by default
     * @zh 设置当前节点旋转为面向目标位置，默认前方为 -z 方向
     * @param pos Target position
     * @param up Up direction
     */
    public lookAt (pos: Vec3, up?: Vec3): void {
        this.getWorldPosition(v3_a);
        Vec3.subtract(v3_a, v3_a, pos);
        Vec3.normalize(v3_a, v3_a);
        Quat.fromViewUp(q_a, v3_a, up);
        this.setWorldRotation(q_a);
    }

    // ===============================
    // transform maintainer
    // ===============================

    /**
     * @en Invalidate the world transform information
     * for this node and all its children recursively
     * @zh 递归标记节点世界变换为 dirty
     * @param dirtyBit The dirty bits to setup to children, can be composed with multiple dirty bits
     */
    public invalidateChildren (dirtyBit: TransformBit) {
        if ((this._dirtyFlags & this.hasChangedFlags & dirtyBit) === dirtyBit) { return; }
        this._dirtyFlags |= dirtyBit;
        bookOfChange.set(this._id, this.hasChangedFlags | dirtyBit);
        dirtyBit |= TransformBit.POSITION;
        const len = this._children.length;
        for (let i = 0; i < len; ++i) {
            const child = this._children[i];
            if (child.isValid) { child.invalidateChildren(dirtyBit); }
        }
    }

    /**
     * @en Update the world transform information if outdated
     * @zh 更新节点的世界变换信息
     */
    public updateWorldTransform () {
        if (!this._dirtyFlags) { return; }
        let cur: this | null = this;
        let i = 0;
        while (cur && cur._dirtyFlags) {
            // top level node
            array_a[i++] = cur;
            cur = cur._parent;
        }
        let child: this; let dirtyBits = 0;
        while (i) {
            child = array_a[--i];
            dirtyBits |= child._dirtyFlags;
            if (cur) {
                if (dirtyBits & TransformBit.POSITION) {
                    Vec3.transformMat4(child._pos, child._lpos, cur._mat);
                    child._mat.m12 = child._pos.x;
                    child._mat.m13 = child._pos.y;
                    child._mat.m14 = child._pos.z;
                }
                if (dirtyBits & TransformBit.RS) {
                    Mat4.fromRTS(child._mat, child._lrot, child._lpos, child._lscale);
                    Mat4.multiply(child._mat, cur._mat, child._mat);
                    if (dirtyBits & TransformBit.ROTATION) {
                        Quat.multiply(child._rot, cur._rot, child._lrot);
                    }
                    Mat3.fromQuat(m3_1, Quat.conjugate(qt_1, child._rot));
                    Mat3.multiplyMat4(m3_1, m3_1, child._mat);
                    child._scale.x = m3_1.m00;
                    child._scale.y = m3_1.m04;
                    child._scale.z = m3_1.m08;
                }
            } else {
                if (dirtyBits & TransformBit.POSITION) {
                    Vec3.copy(child._pos, child._lpos);
                    child._mat.m12 = child._pos.x;
                    child._mat.m13 = child._pos.y;
                    child._mat.m14 = child._pos.z;
                }
                if (dirtyBits & TransformBit.RS) {
                    if (dirtyBits & TransformBit.ROTATION) {
                        Quat.copy(child._rot, child._lrot);
                    }
                    if (dirtyBits & TransformBit.SCALE) {
                        Vec3.copy(child._scale, child._lscale);
                    }
                    Mat4.fromRTS(child._mat, child._rot, child._pos, child._scale);
                }
            }
            child._dirtyFlags = TransformBit.NONE;
            cur = child;
        }
    }

    // ===============================
    // transform
    // ===============================

    /**
     * @en Set position in local coordinate system
     * @zh 设置本地坐标
     * @param position Target position
     */
    public setPosition (position: Vec3): void;

    /**
     * @en Set position in local coordinate system
     * @zh 设置本地坐标
     * @param x X axis position
     * @param y Y axis position
     * @param z Z axis position
     */
    public setPosition (x: number, y: number, z: number): void;

    public setPosition (val: Vec3 | number, y?: number, z?: number) {
        if (y === undefined || z === undefined) {
            Vec3.copy(this._lpos, val as Vec3);
        } else {
            Vec3.set(this._lpos, val as number, y, z);
        }

        this.invalidateChildren(TransformBit.POSITION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
        }
    }

    /**
     * @en Get position in local coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取本地坐标，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getPosition (out?: Vec3): Vec3 {
        if (out) {
            return Vec3.set(out, this._lpos.x, this._lpos.y, this._lpos.z);
        } else {
            return Vec3.copy(new Vec3(), this._lpos);
        }
    }

    /**
     * @en Set rotation in local coordinate system with a quaternion representing the rotation
     * @zh 用四元数设置本地旋转
     * @param rotation Rotation in quaternion
     */
    public setRotation (rotation: Quat): void;

    /**
     * @en Set rotation in local coordinate system with a quaternion representing the rotation
     * @zh 用四元数设置本地旋转
     * @param x X value in quaternion
     * @param y Y value in quaternion
     * @param z Z value in quaternion
     * @param w W value in quaternion
     */
    public setRotation (x: number, y: number, z: number, w: number): void;

    public setRotation (val: Quat | number, y?: number, z?: number, w?: number) {
        if (y === undefined || z === undefined || w === undefined) {
            Quat.copy(this._lrot, val as Quat);
        } else {
            Quat.set(this._lrot, val as number, y, z, w);
        }
        this._eulerDirty = true;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Set rotation in local coordinate system with euler angles
     * @zh 用欧拉角设置本地旋转
     * @param x X axis rotation
     * @param y Y axis rotation
     * @param z Z axis rotation
     */
    public setRotationFromEuler (x: number, y: number, z: number): void {
        Vec3.set(this._euler, x, y, z);
        Quat.fromEuler(this._lrot, x, y, z);
        this._eulerDirty = false;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Get rotation as quaternion in local coordinate system, please try to pass `out` quaternion and reuse it to avoid garbage.
     * @zh 获取本地旋转，注意，尽可能传递复用的 [[Quat]] 以避免产生垃圾。
     * @param out Set the result to out quaternion
     * @return If `out` given, the return value equals to `out`, otherwise a new quaternion will be generated and return
     */
    public getRotation (out?: Quat): Quat {
        if (out) {
            return Quat.set(out, this._lrot.x, this._lrot.y, this._lrot.z, this._lrot.w);
        } else {
            return Quat.copy(new Quat(), this._lrot);
        }
    }

    /**
     * @en Set scale in local coordinate system
     * @zh 设置本地缩放
     * @param scale Target scale
     */
    public setScale (scale: Vec3): void;

    /**
     * @en Set scale in local coordinate system
     * @zh 设置本地缩放
     * @param x X axis scale
     * @param y Y axis scale
     * @param z Z axis scale
     */
    public setScale (x: number, y: number, z: number): void;

    public setScale (val: Vec3 | number, y?: number, z?: number) {
        if (y === undefined || z === undefined) {
            Vec3.copy(this._lscale, val as Vec3);
        } else {
            Vec3.set(this._lscale, val as number, y, z);
        }

        this.invalidateChildren(TransformBit.SCALE);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.SCALE);
        }
    }

    /**
     * @en Get scale in local coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取本地缩放，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getScale (out?: Vec3): Vec3 {
        if (out) {
            return Vec3.set(out, this._lscale.x, this._lscale.y, this._lscale.z);
        } else {
            return Vec3.copy(new Vec3(), this._lscale);
        }
    }

    /**
     * @en Inversely transform a point from world coordinate system to local coordinate system.
     * @zh 逆向变换一个空间点，一般用于将世界坐标转换到本地坐标系中。
     * @param out The result point in local coordinate system will be stored in this vector
     * @param p A position in world coordinate system
     */
    public inverseTransformPoint (out: Vec3, p: Vec3) {
        Vec3.copy(out, p);
        let cur = this; let i = 0;
        while (cur._parent) {
            array_a[i++] = cur;
            cur = cur._parent;
        }
        while (i >= 0) {
            Vec3.transformInverseRTS(out, out, cur._lrot, cur._lpos, cur._lscale);
            cur = array_a[--i];
        }
        return out;
    }

    /**
     * @en Set position in world coordinate system
     * @zh 设置世界坐标
     * @param position Target position
     */
    public setWorldPosition (position: Vec3): void;

    /**
     * @en Set position in world coordinate system
     * @zh 设置世界坐标
     * @param x X axis position
     * @param y Y axis position
     * @param z Z axis position
     */
    public setWorldPosition (x: number, y: number, z: number): void;

    public setWorldPosition (val: Vec3 | number, y?: number, z?: number) {
        if (y === undefined || z === undefined) {
            Vec3.copy(this._pos, val as Vec3);
        } else {
            Vec3.set(this._pos, val as number, y, z);
        }
        const parent = this._parent;
        const local = this._lpos;
        if (parent) {
            // TODO: benchmark these approaches
            /* */
            parent.updateWorldTransform();
            Vec3.transformMat4(local, this._pos, Mat4.invert(m4_1, parent._mat));
            /* *
            parent.inverseTransformPoint(local, this._pos);
            /* */
        } else {
            Vec3.copy(local, this._pos);
        }

        this.invalidateChildren(TransformBit.POSITION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
        }
    }

    /**
     * @en Get position in world coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取世界坐标，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getWorldPosition (out?: Vec3): Vec3 {
        this.updateWorldTransform();
        if (out) {
            return Vec3.copy(out, this._pos);
        } else {
            return Vec3.copy(new Vec3(), this._pos);
        }
    }

    /**
     * @en Set rotation in world coordinate system with a quaternion representing the rotation
     * @zh 用四元数设置世界坐标系下的旋转
     * @param rotation Rotation in quaternion
     */
    public setWorldRotation (rotation: Quat): void;

    /**
     * @en Set rotation in world coordinate system with a quaternion representing the rotation
     * @zh 用四元数设置世界坐标系下的旋转
     * @param x X value in quaternion
     * @param y Y value in quaternion
     * @param z Z value in quaternion
     * @param w W value in quaternion
     */
    public setWorldRotation (x: number, y: number, z: number, w: number): void;

    public setWorldRotation (val: Quat | number, y?: number, z?: number, w?: number) {
        if (y === undefined || z === undefined || w === undefined) {
            Quat.copy(this._rot, val as Quat);
        } else {
            Quat.set(this._rot, val as number, y, z, w);
        }
        if (this._parent) {
            this._parent.updateWorldTransform();
            Quat.multiply(this._lrot, Quat.conjugate(this._lrot, this._parent._rot), this._rot);
        } else {
            Quat.copy(this._lrot, this._rot);
        }
        this._eulerDirty = true;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Set rotation in world coordinate system with euler angles
     * @zh 用欧拉角设置世界坐标系下的旋转
     * @param x X axis rotation
     * @param y Y axis rotation
     * @param z Z axis rotation
     */
    public setWorldRotationFromEuler (x: number, y: number, z: number): void {
        Quat.fromEuler(this._rot, x, y, z);
        if (this._parent) {
            this._parent.updateWorldTransform();
            Quat.multiply(this._lrot, Quat.conjugate(this._lrot, this._parent._rot), this._rot);
        } else {
            Quat.copy(this._lrot, this._rot);
        }
        this._eulerDirty = true;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Get rotation as quaternion in world coordinate system, please try to pass `out` quaternion and reuse it to avoid garbage.
     * @zh 获取世界坐标系下的旋转，注意，尽可能传递复用的 [[Quat]] 以避免产生垃圾。
     * @param out Set the result to out quaternion
     * @return If `out` given, the return value equals to `out`, otherwise a new quaternion will be generated and return
     */
    public getWorldRotation (out?: Quat): Quat {
        this.updateWorldTransform();
        if (out) {
            return Quat.copy(out, this._rot);
        } else {
            return Quat.copy(new Quat(), this._rot);
        }
    }

    /**
     * @en Set scale in world coordinate system
     * @zh 设置世界坐标系下的缩放
     * @param scale Target scale
     */
    public setWorldScale (scale: Vec3): void;

    /**
     * @en Set scale in world coordinate system
     * @zh 设置世界坐标系下的缩放
     * @param x X axis scale
     * @param y Y axis scale
     * @param z Z axis scale
     */
    public setWorldScale (x: number, y: number, z: number): void;

    public setWorldScale (val: Vec3 | number, y?: number, z?: number) {
        if (y === undefined || z === undefined) {
            Vec3.copy(this._scale, val as Vec3);
        } else {
            Vec3.set(this._scale, val as number, y, z);
        }
        const parent = this._parent;
        if (parent) {
            parent.updateWorldTransform();
            Mat3.fromQuat(m3_1, Quat.conjugate(qt_1, parent._rot));
            Mat3.multiplyMat4(m3_1, m3_1, parent._mat);
            m3_scaling.m00 = this._scale.x;
            m3_scaling.m04 = this._scale.y;
            m3_scaling.m08 = this._scale.z;
            Mat3.multiply(m3_1, m3_scaling, Mat3.invert(m3_1, m3_1));
            this._lscale.x = Vec3.set(v3_a, m3_1.m00, m3_1.m01, m3_1.m02).length();
            this._lscale.y = Vec3.set(v3_a, m3_1.m03, m3_1.m04, m3_1.m05).length();
            this._lscale.z = Vec3.set(v3_a, m3_1.m06, m3_1.m07, m3_1.m08).length();
        } else {
            Vec3.copy(this._lscale, this._scale);
        }

        this.invalidateChildren(TransformBit.SCALE);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(SystemEventType.TRANSFORM_CHANGED, TransformBit.SCALE);
        }
    }

    /**
     * @en Get scale in world coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取世界缩放，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getWorldScale (out?: Vec3): Vec3 {
        this.updateWorldTransform();
        if (out) {
            return Vec3.copy(out, this._scale);
        } else {
            return Vec3.copy(new Vec3(), this._scale);
        }
    }

    /**
     * @en Get a world transform matrix
     * @zh 获取世界变换矩阵
     * @param out Set the result to out matrix
     * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
     */
    public getWorldMatrix (out?: Mat4): Mat4 {
        this.updateWorldTransform();
        if (!out) { out = new Mat4(); }
        return Mat4.copy(out, this._mat);
    }

    /**
     * @en Get a world transform matrix with only rotation and scale
     * @zh 获取只包含旋转和缩放的世界变换矩阵
     * @param out Set the result to out matrix
     * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
     */
    public getWorldRS (out?: Mat4): Mat4 {
        this.updateWorldTransform();
        if (!out) { out = new Mat4(); }
        Mat4.copy(out, this._mat);
        out.m12 = 0; out.m13 = 0; out.m14 = 0;
        return out;
    }

    /**
     * @en Get a world transform matrix with only rotation and translation
     * @zh 获取只包含旋转和位移的世界变换矩阵
     * @param out Set the result to out matrix
     * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
     */
    public getWorldRT (out?: Mat4): Mat4 {
        this.updateWorldTransform();
        if (!out) { out = new Mat4(); }
        return Mat4.fromRT(out, this._rot, this._pos);
    }

    /**
     * @en Set local transformation with rotation, position and scale separately.
     * @zh 一次性设置所有局部变换（平移、旋转、缩放）信息
     * @param rot The rotation
     * @param pos The position
     * @param scale The scale
     */
    public setRTS (rot?: Quat | Vec3, pos?: Vec3, scale?: Vec3) {
        let dirtyBit: TransformBit = 0;
        if (rot) {
            dirtyBit |= TransformBit.ROTATION;
            if ((rot as Quat).w !== undefined) {
                Quat.copy(this._lrot, rot as Quat);
                this._eulerDirty = true;
            } else {
                Vec3.copy(this._euler, rot);
                Quat.fromEuler(this._lrot, rot.x, rot.y, rot.z);
                this._eulerDirty = false;
            }
        }
        if (pos) {
            Vec3.copy(this._lpos, pos);
            dirtyBit |= TransformBit.POSITION;
        }
        if (scale) {
            Vec3.copy(this._lscale, scale);
            dirtyBit |= TransformBit.SCALE;
        }
        if (dirtyBit) {
            this.invalidateChildren(dirtyBit);
            if (this._eventMask & TRANSFORM_ON) {
                this.emit(SystemEventType.TRANSFORM_CHANGED, dirtyBit);
            }
        }
    }

    /**
     * @en Pause all system events which is dispatched by [[SystemEvent]]
     * @zh 暂停所有 [[SystemEvent]] 派发的系统事件
     * @param recursive Whether pause system events recursively for the child node tree
     */
    public pauseSystemEvents (recursive: boolean): void {
        // @ts-ignore
        eventManager.pauseTarget(this, recursive);
    }

    /**
     * @en Resume all paused system events which is dispatched by [[SystemEvent]]
     * @zh 恢复所有 [[SystemEvent]] 派发的系统事件
     * @param recursive Whether resume system events recursively for the child node tree
     */
    public resumeSystemEvents (recursive: boolean): void {
        // @ts-ignore
        eventManager.resumeTarget(this, recursive);
    }
}

legacyCC.Node = Node;
