---
layout: post
category : MySQL
tags : [Monitor]
title: MySQL复制的监控脚本
---
{% include JB/setup %}
    #!/bin/sh
    # replication_monitor.sh – a mysql replication monitor
    # Copyright (C) 2006 Mihai Secasiu http://patchlog.com
    #
    # This program is free software; you can redistribute it and/or modify
    # it under the terms of the GNU General Public License version 2 as
    # published by the Free Software Foundation
    #
    # This program is distributed in the hope that it will be useful,
    # but WITHOUT ANY WARRANTY; without even the implied warranty of
    # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    # GNU General Public License for more details.
    #
    # You should have received a copy of the GNU General Public License
    # along with this program; if not, write to the Free Software
    # Foundation, Inc., 59 Temple Place – Suite 330, Boston, MA 02111-1307, USA.
    #

    DB_USER=replc
    DB_PASS=”"

    alert_to=”"
    alert_cc=”"
    alert_failed_subject=”REPLICATION FAILED”
    alert_failed_message=”one of the replication threads on the slave server failed or the server is down\n”;
    alert_slow_subject=”REPLICATION SLOW”
    alert_slow_message=”the slave is behind by “;

    lockfile=/tmp/replication_monitor.lock
    rf=$(mktemp)

    echo “show slave status\G”|\
    mysql -u $DB_USER –password=$DB_PASS > $rf 2>&1

    repl_IO=$(cat $rf|grep “Slave_IO_Running”|cut -f2 -d’:')
    repl_SQL=$(cat $rf|grep “Slave_SQL_Running”|cut -f2 -d’:')
    repl_BEHIND=$(cat $rf|grep “Seconds_Behind_Master”|cut -f2 -d’:')

    if [ ! -e $lockfile ] ; then

    # alert down
    if [ "$repl_IO" != " Yes" -o "$repl_SQL" != " Yes" ] ; then
    if [ "$alert_cc" != "" ] ; then
    cc=” -c $alert_cc ”
    fi

    cat <<EOF | mail -s "$alert_failed_subject" $alert_to $cc
    $alert_failed_message

    return from slave status command:
    $(cat $rf)
    EOF
    rm $rf
    fi

    # alert slow
    if [ $repl_BEHIND -ge 30 ] ; then
    if [ "$alert_cc" != "" ] ; then
    cc=" -c $alert_cc "
    fi

    cat <<EOF | mail -s "$alert_slow_subject" $alert_to $cc
    $alert_slow_message $repl_BEHIND seconds
    EOF
    fi

    touch $lockfile

    fi

[http://www.orczhou.com/index.php/2009/05/a-monitor-for-mysql-replication/](http://www.orczhou.com/index.php/2009/05/a-monitor-for-mysql-replication/)
[http://patchlog.com/databases/mysql-replication-monitor/](http://patchlog.com/databases/mysql-replication-monitor/)