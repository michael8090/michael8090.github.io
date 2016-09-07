---
layout: post
title:  "敏捷开发里的git工作流"
date:   2016-09-07 03:59:54 +0800
tags: misc git scrum
---

> TLDR:
> 1. 从master拉feature分支
> 2. 只在需要做集成测试的时候才将feature merge 回develop
> 3. 不使用release分支

最近我们公司在调整对于敏捷项目的vcs使用规范，我也参照之前用的较多的gitflow来研究了一下，趁还记得做一下总结。

首先我们看看敏捷项目有什么特征，然后看看gitflow的行为是什么以及它对敏捷开发的支持程度如何，最后根据gitflow不匹配的地方进行调整，以满足我们的开发需求。

## 敏捷开发的特点

敏捷项目把发布周期定义为一个sprint，sprint的长度是固定的，通常为两周，每个sprint里包含了多个feature，如果某个feature不能按时完成，通常就顺延到下个sprint里去。

这里我们可以看出，敏捷开发有如下两个特点：

1. 发布周期是优先级最高的，也就是不论feature完成情况如何，到了一定时间必须要按时发布新版本（未完成的feature顺延）
2. 制定sprint计划时放到该sprint里的feature的数量是确定的，但不一定都能发布

## gitflow的行为

首先看一张[著名文章](http://nvie.com/posts/a-successful-git-branching-model/)里的gitflow的图:

![gitflow image](http://nvie.com/img/git-model@2x.png)

参照上图里的gitflow工作流，会发现它和我们上面讲的敏捷开发的两个特点是不符合的：

1. gitflow里是以feature的数量作为衡量当前代码能不能构成一个新release的标准，换句话说，发布时间不固定，达到了一定feature量就发布
2. 如果某个feature在进入release之后发现有严重问题，修复时间又很长，就推迟发布日期，这点可以从release branch的生命周期看出来

## 敏捷开发里的git workflow

由于敏捷开发要求按时发布，所以我们要保证sprint里的feature：
1. 互不影响。由于feature之间没有相互依赖，当某个feature没有按时完成时，只有它自己受到了影响，其它feature可以正常merge到集成测试分支
2. feature branch merge回集成测试分支（假设为develop branch）后能够安全撤销。当某个feature merge到develop，测出了非常难以修好的集成测试issue，导致不能按时完成发布时，需要对该feature做撤销操作，将该feature顺延到下个sprint，其它feature照常发布

所以在gitflow的基础上，我们做出如下调整

1. 一个sprint里的所有的feature branch都从master branch上拉，而不是像gitflow里的从develop branch上拉

  原因：我们要求feature尽量能够独立开发，从master上拉feature分支可以最大程度保证feature有一个干净的起点

2. 只有在需要做集成测试的时候才将feature merge回develop（feature的bug fix在集成测试之前不要merge回develop）

  原因：每一个feature都潜在有被revert的需要，只在需要做集成测试的时候merge回develop可以最大程度减少merge commit的数量，在某个feature不能按时发布时只用revert较少的commit

3. 不使用release分支

  原因：我们同一个时刻只有一个正在开发的release，并且release里的feature是不固定的，将多个feature合并到同一个release里没有必要也不满足隔离feature的需求

## workflow

于是我们得到了如下的workflow：

1. 从master新建feature分支（feature/a, feature/b...)
2. 在feature上独立开发，SE需要在feature分支上搭建测试环境给QE，同时不断修复QE提出的issue
3. QE认为feature已经满足上线需求后，SE将feature合并回develop分支，QE在develop上做集成测试（在此期间可以自由的从develop merge到feature，但不要随意将feature merge 到 develop）
4. 根据在集成测试环境里是否测出了集成测试issue，分如下两种情况
  1. 没有集成测试issue，feature开发完成
  2. 在集成测试环境（假设建立在commit #CI_COMMIT上）里发现了集成测试issue，SE将#CI_COMMIT merge回feature分支，在上面继续做开发，重复3和4。这里根据是否能在当前sprint结束之前完成bug fix又分为两种情况：
    1. 能够在sprint结束前完成bug fix，则feature开发完成
    2. 不能及时完成bug fix，则需要**回滚当前feature在develop branch上的所有merge commit**，同时在任务里标记当前feature推迟到下一个sprint
5. 将develop merge 到master，打好tag，根据需要删掉已经完成的feature的branch
6. 如果master上发现了issue，按照hotfix处理（和git flow一致）

核心是保证feature可以独立开发，在遇到某个feature不能按时发布时能够以较低成本将该feature移出当前sprint。
