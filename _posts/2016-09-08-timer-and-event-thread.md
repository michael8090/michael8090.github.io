---
layout: post
title:  "浏览器里timer所在的线程、event task runner以及主线程的关系"
date:   2016-09-08 00:09:00 +0800
tags: web js note
---

timer [task runner](https://code.google.com/p/chromium/codesearch#chromium/src/base/task_runner.h&q=TaskRunner&sq=package:chromium&type=cs)是跑在主线程里的。。。 不是单独的另一个线程, 而input event是另一个线程

```js
/**
if timer task runner is on another thread but main thread, 10s latter,
all the logs should be printed at once
otherwise, if timer task runner is inside main thread,
it has to wait for all the sync codes in a task to be
finished before checking the time and setting up the timer
related task, in which case the logs are printed one by
one(with 300ms time gaps in between) after 10s
*/
(function () {
    let n = 10;
    const timer = setInterval(function () {
        if (n--) {
            console.log(n);
            return;
        }
        clearInterval(timer);
    }, 300);
    const tenSecondsLatter = Date.now() + 10000;
    while(Date.now() < tenSecondsLatter) {}
    console.log('10s latter');
})();
```

顺便提一句，chrome的[compositor](https://www.chromium.org/developers/design-documents/compositor-thread-architecture)有自己的独立线程并且会在主线程之前拿到用户输入事件然后在合适的时间将这些事件交给主线程，所以在浏览器在主线程busy的时候仍然能记录下busy期间所有的input event，在主线程idle的时候触发event handler
