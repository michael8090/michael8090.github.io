---
layout: post
title:  "font-family 和 font-weight"
date:   2016-09-08 00:09:00 +0800
tags: web css note
---
font-weight的取值从100到900，共9个值，但不同的字体对他们的支持不一样，通常分为3段：normal，bold，bolder
经过测试发现：

osx 下：
     Arial和Tohoma的font-weight 只有两段：100~500、600~900，Helvetica有3段（100~300、400~500、600~900）；
     默认华文黑体：100~400、500~600、700~900， 并且中文字体可以显示非中文字符

windows下：
     Arial有3段（100~500， 600~700，800~900），Tohoma有两段（100~500， 600~900）；
     微软雅黑：100~300、400~500、600~900，并且中文字体可以显示非中文字符

综上，如果写font-family的时候把Tanoma、Arial写在中文字体前面，会导致：

- fontweight默认落在了第一段，但英文字体的第一段的粗细和中文字体的不一致，导致同一行文字粗细不同

- 如果用css动态改变同一行的font-weight，会发现英文和中文不是同步变的

结论：写font-family时把font-weight段数多的字体（上面例子里的中文字体）放在段数少的字体（上面例子里的英文字体）前面，保证font-weight的一致性
