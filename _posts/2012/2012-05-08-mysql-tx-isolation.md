---
layout: post
category : MySQL
tags : [MySQL, Isolation, InnoDB]
title: InnoDB RC与RR的优缺点对比
---
{% include JB/setup %}

1. RR支持statement binlog，RC不支持(支持mixed，row)；

2. RR支持gap lock，RC不支持(并发更高)；

3. RC支持半一致读(semi consistent，并发更高)，RR不支持；

4. RC是语句级多版本(事务的多条只读语句，创建不同的ReadView，代价更高)，RR是事务级多版本(一个ReadView)；

来自： [http://weibo.com/2216172320/yi5oeovYu](http://weibo.com/2216172320/yi5oeovYu)
