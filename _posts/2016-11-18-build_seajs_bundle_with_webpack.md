---
layout: post
title:  "使用webpack打包seajs模块"
date:   2016-11-18 15:43:00 +0800
tags: webpack seajs
---

## 背景

seajs已经被[正式宣布废弃](https://github.com/seajs/seajs/issues/1605#issuecomment-149220246)了很久了，但我们公司已有的代码都是基于seajs来组织模块的，文件多了之后网络请求明显过多，导致载入性能下降。如果要用webpack之类的工具打包，则需要将seajs模块的写法转化成标准的commonjs或者AMD的形式。在当前已具有较大规模的codebase上整个重写的话工程量太大，成本过高，所以需要一个满足如下两点要求的打包解决方案：

> 1. 打包本身对开发者透明，不需要修改代码
> 2. 打包能够兼容新的标准，以便让新的模块能够使用标准的ES6的模块系统，逐步将模块系统迁移到ES6

## 思路

为了满足上面的第一个要求，我们需要了解seajs与commonjs/AMD用法之间的区别，然后编写babel插件，在编译阶段将seajs模块转换为标准模块，然后交给webpack进行打包。由于是在编译时修改了源代码，该过程对于使用seajs的开发者透明。

而由于我们在编译阶段将模块转换成标准模块，所以上面的解决方案能够满足第二点要求。

### seajs与标准模块不一致的地方

#### alias

在seajs的config里是可以配置模块别名的，这个容易通过配置webpack的alias字段完美解决。

#### 绝对路径

在seajs里可以通过配置根目录来允许在require()里使用绝对路径的，例如require('/static/a'), 而在commonjs里`/static/a`会被当作系统的根目录下的`static/a`，所以需要在编译时将绝对路径转换成相对路径（如`../../static/a`)。

babel插件（[babel-plugin-root-resolver ](https://www.npmjs.com/package/babel-plugin-root-resolver)）如下：

```js
/**
 * Created by yiming on 2016/8/18.
 * in:
 *      define('id', ['/otherDir/componnent/a'], function () {})
 *      require('/otherDir/componnent/a');
 *
 * out:
 *      define('id', ['../../otherDir/componnent/a'], function () {})
 *      require('../../otherDir/componnent/a');
 *
 */
import path from 'path';

export default ({types: t}) => {
    const cwd = process.cwd();
    return {
        visitor: {
            CallExpression({node}, state) {
                function renameAbsolutePath(e) {
                    if (e.type === 'StringLiteral' && e.value[0] === '/') {
                        const oldValue = e.value;
                        const newValue = path.relative(state.file.opts.filename, path.resolve(cwd, '.' + oldValue));
                        e.value = newValue;
                    }
                }
                const args = node.arguments;
                const {callee} = node;
                if (callee.name === 'define') {
                    args.forEach(a => {
                        if (a.type === 'ArrayExpression') {
                            a.elements.forEach(renameAbsolutePath);
                        }
                    });
                }

                if (callee.name === 'require' || (callee.type === 'MemberExpression' && callee.object.name === 'require' && callee.property.name === 'ensure')) {
                    args.forEach(renameAbsolutePath);
                }
            }
        }
    };
};

```

#### define()额外的依赖数组

在seajs里有一种类似于commonjs的async module的写法:

```js
define(id, ['dep1', 'dep2', ...], (require, export, module) => {})
```

但在commonjs里函数签名是这样的:

```js
define(id, (require, export, module) => {})
```

所以可以直接去掉第二个参数，babel插件（[babel-plugin-remove-seajs-dependency-array](https://www.npmjs.com/package/babel-plugin-remove-seajs-dependency-array)）代码如下：

```js
/**
 * in(seajs):
 *      define(id, ['a', 'b'], function(require, export, module){})
*  out(asynchronous cmd):
*       define(id, function(require, export, module){})
*/
export default ({types: t}) => {
    return {
        visitor: {
            CallExpression({node}) {
                if (node.callee.name === 'define') {
                    const args = node.arguments;
                    args.some((a, i) => {
                        if (a.type === 'ArrayExpression') {
                            const requireCallback = args[args.length - 1];
                            const firstDependency = a.elements[0];
                            const firstCallbackArg = requireCallback.params && requireCallback.params[0];
                            if (!firstCallbackArg) {
                                return true;
                            }
                            const firstCallbackArgName = firstCallbackArg.name;
                            if (firstDependency !== firstCallbackArgName) {
                                // we got seajs
                                args.splice(i, 1);
                            }
                            return true;
                        }
                        return false;
                    });
                }
            }
        }
    };
};
```

#### seajs独有的require.async

seajs里的require.async()函数可以用来做模块的条件加载和懒加载，commonjs和AMD里并没有对应的函数，幸运的是webpack提供了一个相同功能的函数require.ensure()，但两者函数签名并不一致：

seajs:

```js
require.async(['a', 'b', ...], function onResolved(a, b, ...) {/* business code */})
```

webpack:

```js
require.ensure(['a', 'b', ...], function onResolved(require) {
    const a = require('a');
    const b = require('b');
    ...
    /* business code */
})
```

可以看出，我们需要在webpack的ensure里将依赖逐一require，拿到实际的依赖模块，然后传给seajs里写的callback。

babel插件（[babel-plugin-seajs-async-to-webpack-ensure](https://www.npmjs.com/package/babel-plugin-seajs-async-to-webpack-ensure)）代码如下：

```js
/**
 * in(seajs):
 *      require.async(['a', 'b'], function onResolved(a, b){xxx})
*  out(asynchronous cmd):
*       require.ensure(['a', 'b'], function(require){
*           (function onResolved(a, b){xxx}).apply(null, ...[require('a'), require('b')]);
*       })
*/

function getRequires(t, depArgument) {
    const deps = depArgument.type === 'ArrayExpression' ? depArgument.elements : [depArgument];
    return t.ArrayExpression(deps.map(d => t.CallExpression(t.Identifier('require'), [d])));
}

export default ({types: t}) => {
    return {
        visitor: {
            CallExpression(path, state) {
                const {node} = path;
                const {callee, arguments: args} = node;
                if (arguments.length > 0
                    && callee.type === 'MemberExpression'
                    && callee.object.name === 'require'
                    && callee.property.name === 'async') {
                    const newAst = t.ExpressionStatement(t.CallExpression(
                        t.MemberExpression(t.Identifier('require'), t.Identifier('ensure')),
                        [
                            args[0],
                            t.FunctionExpression(null, [t.Identifier('require')], t.BlockStatement([
                                t.ExpressionStatement(t.CallExpression(
                                    t.MemberExpression(
                                        args[1] || t.FunctionExpression(null, [], t.BlockStatement([])),
                                        t.Identifier('apply')
                                    ),

                                    [t.NullLiteral(), getRequires(t, args[0])]
                                ))
                            ]))
                        ]
                    ));
                    path.replaceWith(newAst);
                }
            }
        }
    };
};

```

## 总结

可以看到基于AST的babel插件能够在编译的过程中大幅提高我们对代码的控制能力，而本文在明确seajs需要解决的问题的情况下合理的利用工具完成了seajs的打包和模块系统的渐进式迁移，相信对于国内采用seajs的前端团队具有一定的借鉴意义。
