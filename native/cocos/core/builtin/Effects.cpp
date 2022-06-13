/****************************************************************************
 Copyright (c) 2021 Xiamen Yaji Software Co., Ltd.

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
****************************************************************************/

// clang-format off
#include "core/builtin/Effects.h"
#include "base/StringUtil.h"
namespace cc {

// absolute essential effects
const GzipedString BUILTIN_EFFECTS { 
"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"
"nagtZCAWdteBxakIi9OXP/4fd7J04VLKAgA="
};
} // namespace cc