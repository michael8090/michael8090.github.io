---
layout: post
title:  "create services with upstate on linux"
date:   2016-09-06 01:24:00 +0800
tags: linux misc memo
---
Create `myservice.conf` under `/etc/init`, with the following content

```bash
# the blog service
start on filesystem
script
        cd /public/www
        npm start --production
end script
```


Add a link to `init.d` to allow auto complete for that service:

```bash
ln -s /etc/init/myservice.conf /etc/init.d/myservice
```
