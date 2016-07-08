---
layout: post
category : MySQL
tags : [MySQL, SWAP]
title: How to check if MySQL has been swapped out?
---
{% include JB/setup %}
How to check if any MySQL memory has been swapped out? This post explains it.

Check if system is currently using any swap:

    server ~ # free -m
                 total       used       free     shared    buffers     cached
    Mem:          3954       2198       1755          0        190       1040
    -/+ buffers/cache:        968       2985
    Swap:         3906          0       3906

In the above example swap is not in use, so no further checks would be necessary.

However if free command would report some usage, how to check whether MySQL memory was swapped out or not?

It is not possible to determine that using standard tools such as ps or top. They will report various memory related information per each process, but no clear indication whether something is in RAM or in swap space. But it is possible with this trivial command:

    awk '/^Swap:/ { SWAP+=$2 } END { print SWAP" kB" }' /proc/$(pidof mysqld)/smaps

For example:

    server ~ # awk '/^Swap:/ { SWAP+=$2 } END { print SWAP" kB" }' /proc/$(pidof mysqld)/smaps
    612 kB

Linux reported 612KB of MySQL memory to have been swapped out. /proc/$(pidof mysqld)/smaps file was introduced in kernel 2.6.14, so it should be available on many, even not so recent, Linux distributions.

On Solaris, the quickest way is:

    root@osol1:~# pmap -S 925 |grep mysqld
    925:    /opt/csw/mysql5/libexec/mysqld --defaults-file=/opt/csw/mysql5/var/my.
    0000000000400000       8784          - r-x--  mysqld
    0000000000CA3000       1940       1940 rw---  mysqld
.
The third column shows the swap usage.

If you need more infomration about [How to prevent swapping on a MySQL server?](http://www.dbasquare.com/2012/04/02/how-to-prevent-swapping-on-a-mysql-server/), this post will drive you through all details.
