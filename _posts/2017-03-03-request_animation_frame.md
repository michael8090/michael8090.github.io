---
layout: post
title:  "requestAnimationFrame()的行为"
date:   2017-03-03 22:30:00 +0800
tags: webapi
---

本文介绍了`requestAnimationFrame`的行为，分析了出现超过16ms的长帧的可能情况。

## 关于性能的传说

如果你用js实现过web上的动画效果，一定会遇到（至少是听说）`requestAnimationFrame`（下文简称RAF）这个函数。根据[文档](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)，该函数允许用户在浏览器**渲染之前**执行一个函数，在这个函数里修改DOM element的样式，从而实现*更高性能*的样式修改。它是一个浏览器提供给用户的钩子，让用户在*合适的时机*修改元素的样式。

至于在这个函数里修改元素更高效的原因，这里就不展开讨论了，文档里讲的非常清楚。

这里讲的是这个另一个问题：**在RAF里执行的函数如果小于16ms，一定不会出现渲染超过16ms的帧吗？**

## 先讲答案

**不是的**

如下图：

![result](https://raw.githubusercontent.com/michael8090/michael8090.github.io/master/assets/result.png)

RAF里的任务是执行时间为1ms和6ms交替的序列，[1ms, 6ms, 1ms, 6ms....]，而有一半的帧的时间都超过了20ms。

## requestAnimationFrame的工作过程

我们这里的讨论只关心渲染的开始和结果，所以将浏览器的[渲染管线](https://developers.google.com/web/fundamentals/performance/rendering/)简化如下：

**javascript > composited pixels**

其中composited pixels是浏览器能最终呈现的像素，在使用RAF调用函数（记为f）的时候，浏览器更新的流程如下：

1. 每隔16毫秒尝试进行更新，触发RAF事件
2. 在js主线程里调用f()并执行渲染管线，得到composited pixels
3. 在执行2的同时，在另一个线程里（具体线程名称待确定）大约2ms后开始检查主线程里是否有已经生成好的composited pixelds，它可能来自于f的执行结果，也可能来自于RAF事件的之前的渲染管线。如果检测到了，直接更新呈现的视图（更新新的一帧），否则，等待f及渲染管线执行完，进而更新试图

上面的过程里有两个需要注意的特点：
1. RAF在没有阻塞任务的情况下每16ms触发一次
2. 浏览器更新帧滞后RAF至少2ms，频率尽可能和RAF保持一致

一个流畅的更新过程如下图所示：

![pipeline](https://raw.githubusercontent.com/michael8090/michael8090.github.io/master/assets/60.png)

于是我们得到了如下的事件序列：

* RAF执行函数：[(ts, te), (ts, te), (ts, te), ...] （上图中那些黄色片段的端点）

* Frame更新: [t, t, t, ...] (上图中的那些灰色的虚线)

其中ts、te为RAF收集到的函数的执行开始时间和结束时间，并且由上面的讨论（假设所有RAF函数的执行时间都小于16ms），可以得到

ts[i+1] - ts[i] = 16

te[i] - ts[i] < 16

t[i] = ts[i] + 2 or te[i]

而某一帧的长度T为
T[i] = t[i] - t[i - 1]

于是，当如下情况发生时：

1. t[i] = te[i]（即当te[i] - ts[i] > 2时，此时函数没有在2ms内结束且没有已经渲染好的像素可以显示，浏览器需要等)

2. t[i-1] = ts[i-1] + 2（即te[i-1] - ts[i-1] <= 2时）

T[i] = te[i] - ts[i-1] - 2

而te[i] > ts[i] + 2，

所以T[i] > ts[i] + 2 - ts[i-1] - 2 = 16

证明完成。。。。。

更形象一点的解释是，第一帧需要更新的时候，f1已经执行完成了，渲染管线的输出被第一帧消化掉了，16ms之后，第二帧需要更新了，这个时候它发现当前环境里已经没有可用的composited pixel了，于是只能等f2执行完，而f2执行完之后已经是16ms之后了，所以产生了一个长帧。

注意以上数学公式过程只有两个要求：f1在2ms内完成，f2在2ms以上完成，即一个短任务接一个长任务的时候。

于是我们就可以用如下的代码来精心构建一个任务序列，来测试是否和理论推导一致。

```js
function wrapBody() {
    document.body.innerHTML = '<div style="width: 100%; position: absolute; height: 100%; background: yellow"></div>'
}

function increaseOpacity(opacity) {
    const nextOpacity = opacity + 0.01;
    if (nextOpacity > 1) {
        return 0;
    }
    return nextOpacity;
}

function stuck(time) {
    const startTime = performance.now();    
    while (performance.now() - startTime < time);
}


wrapBody();
const div = document.body.firstChild;

let opacity = 0;
let T = -1;

function start() {
    T = (T + 1) % 2;
    stuck(T * 6); // 0 or 6
    opacity = increaseOpacity(opacity);
    div.style.opacity = increaseOpacity(opacity);
    requestAnimationFrame(start);
}

setTimeout(() => {
    requestAnimationFrame(start);
}, 5000)

```

在上面的代码中我们让任务所用的时间为[0, 6, 0, 6, 0]。

于是就得到了开头我们看到的那张图的结果，有一半的帧都是长帧（为0-6的序列）。

