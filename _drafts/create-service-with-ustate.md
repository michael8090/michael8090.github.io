---
layout: post
title:  "create services with upstate on linux"
date:   2016-09-06 01:24:00 +0800
tags: linux misc memo
---
Create `myservice.conf` under `/etc/init.d`, with the following content

{% highlight bash %}
# the blog service
start on filesystem
script
        cd /public/www
        npm start --production
end script
{% endhighlight %}
