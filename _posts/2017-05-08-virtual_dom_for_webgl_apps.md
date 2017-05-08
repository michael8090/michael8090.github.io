---
layout: post
title:  "在WebGL应用中使用virtual dom（引言）"
date:   2017-05-08 21:13:00 +0800
tags: webgl, virtual dom
---

本文描述了一个可行的在webgl app里使用virtual dom的方法，包括一个简单的react兼容库的实现以及在webgl（threejs）里的应用。

# 问题
最近几个月我在重构公司的一个基于Flash的3D编辑器，该编辑器功能比较复杂，有场景的搭建、模型对象的参数编辑、2d/3d的切换以及撤销重做等一系列典型CAD软件的功能。遇到的第一个问题是：**如何组织一个功能如此复杂的Web App**。

我曾经参与维护过一个大型的数据可视化的web 工程，从这个工程的经验里深刻得体会到了标准的MVC结构对于一个大型项目是不合适的：有限的Model的修改方式会组合出指数级的Model修改业务，而要将这么多种可能出现的Model change组合手动同步到view上去，是非常繁琐且容易出错的过程。我更倾向于使用单项数据流的方式来组织大型程序。

经过一番调研，最终有两个库引起了我的注意：[react-three-renderer](https://github.com/toxicFork/react-three-renderer)和[deck.gl](https://uber.github.io/deck.gl/)。

react-three-renderer是一个threejs的react绑定，该库实现了一个react renderer及一组与threejs里底层类相对应的react component，在运行时将react-component的virtual dom更新转化为对threejs object的更新。该库初看起来完美的满足了我的需求，除了如下两点：

1. 性能：根据它自己的[benchmark](http://toxicfork.github.io/react-three-renderer-example/#/benchmarks_rotating_cubes_react)，当方块的数量为3000时，未采用react更新时帧率为30，而采用时仅有15
2. 多个react renderer不能共存：根据这个[issue](todo)，react是不支持同时使用多个renderer的，也就是说如果我采用了react-three-render，就不能在web app的其他地方使用react了，而我打算在非webgl的也用react

所以此路不通。

另一个库deck.gl是uber开发的一个高性能高精度的数据可视化库，整个库推荐与react一起使用，且内部的[layer](https://github.com/uber/deck.gl/blob/master/src/lib/layer.js)其实是一个简单的virtual dom的实现。这个库的存在证明了一点：**virtual dom技术本身在对性能要求很高的数据可视化领域是可用的**

结合react-three-renderer的性能问题，我初步得出了如下结论：

> 一个高度简化/优化的virtual dom实现是可以满足3D webapp的开发的

在接下来的文章里我会详细讲一下我是怎么实现一个自己的react，并且将它应用到一个基于threejs的web app里的。该项目的最终结果是：

1. 采用了与react api兼容的virtual dom开发
2. 在同一个工程里，也可以用react来写普通的DOM UI的开发，代码风格保持一致，降低学习成本
3. **对于一个典型的复杂3d场景，每次virtual dom的patch时间开销小于1ms**
4. 同样可以支持其他render target，如2d canvas（pixijs）

to be continued...
