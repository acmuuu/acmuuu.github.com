---
layout: post
category : Linux
tags : [Python]
title: 使用supervisor作为uWSGI的守护进程
---
{% include JB/setup %}
**来自[http://luchanghong.com/server/2012/09/10/use-supervisor-as-daemonize-of-uwsgi.html](http://luchanghong.com/server/2012/09/10/use-supervisor-as-daemonize-of-uwsgi.html)**

**安装 supervisor**

使用 pip 或者 easy_install 命令来安装，前提当然是要有 python 环境，我把 supervisor 和 uWSGI 装在同一个虚拟环境里。

	pip install supervisor

**配置一个 program**

安装完成之后，可以使用 python path 里面的命令 echo_supervisor_conf ，用它得到一个默认配置：

	echo_supervisord_conf > /etc/supervisord.conf

把配置文件放在任意文件夹都行，只要有访问权限即可。为了测试，基本配置几乎不用修改，只需要修改一下 supervisor log 的路径，然后配置一个 program ，如下：

	[program:push_web_app]
	user=lch
	command=/Users/lch/.pythonbrew/venvs/Python-2.6.7/env_uwsgi/bin/uwsgi --paste config:/Users/lch/work/adview/push/web/airpush/luchanghong.ini --workers 2 -H /Users/lch/.pythonbrew/venvs/Python-2.6.7/env_push/ --socket :9000 --disable-logging
	process_name=%(program_name)s ; process_name expr (default %(program_name)s)
	numprocs=1                    ; number of processes copies to start (def 1)
	stopsignal=QUIT               ; signal used to kill process (default TERM)
	redirect_stderr=true          ; redirect proc stderr to stdout (default false)
	stdout_logfile=/Users/lch/dev/www/log/uwsgi/app_push.log        ; stdout log path, NONE for none; default AUTO

一些默认配置就不写了。为了方便管理，可以把上面的配置单独提取出来，在主配置文件 supervisor.conf 里面包含一下即可。

PS: 使用了 supervisor ，就不要 --daemonize 这个参数了，换成 stdout_logfile 。

**调试 supervisor**

a.通过 supervisord 命令来启动 supervisor

	supervisord -c /etc/supervisord.conf

启动成功时监控一下 uWSGI 和 supervisor 的 log:

supervisor 的 log ：

	2012-09-10 16:07:14,877 WARN Included extra file "/etc/supervisor/conf.d/push_web_app.conf" during parsing
	2012-09-10 16:07:14,877 INFO Increased RLIMIT_NOFILE limit to 1024
	2012-09-10 16:07:14,907 INFO RPC interface 'supervisor' initialized
	2012-09-10 16:07:14,907 CRIT Server 'unix_http_server' running without any HTTP authentication checking
	2012-09-10 16:07:14,908 INFO daemonizing the supervisord process
	2012-09-10 16:07:14,909 INFO supervisord started with pid 2671
	2012-09-10 16:07:15,912 INFO spawned: 'push_web_app' with pid 2673
	2012-09-10 16:07:16,939 INFO success: push_web_app entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
	
uWSGI 的 log ：

	*** Starting uWSGI 1.2.5 (64bit) on [Mon Sep 10 16:07:15 2012] ***
	compiled with version: 4.2.1 (Based on Apple Inc. build 5658) (LLVM build 2336.11.00) on 06 September 2012 14:23:41
	detected number of CPU cores: 4
	current working directory: /Users/lch
	detected binary path: /Users/lch/.pythonbrew/venvs/Python-2.6.7/env_uwsgi/bin/uwsgi
	*** WARNING: you are running uWSGI without its master process manager ***
	your memory page size is 4096 bytes
	detected max file descriptor number: 1024
	lock engine: OSX spinlocks
	uwsgi socket 0 bound to TCP address :9000 fd 3
	Python version: 2.6.7 (r267:88850, Jul 23 2012, 10:42:33)  [GCC 4.2.1 (Based on Apple Inc. build 5658) (LLVM build 2336.9.00)]
	Set PythonHome to /Users/lch/.pythonbrew/venvs/Python-2.6.7/env_push/
	*** Python threads support is disabled. You can enable it with --enable-threads ***
	Python main interpreter initialized at 0x7faad1c085f0
	your server socket listen backlog is limited to 100 connections
	*** Operational MODE: preforking ***
	Loading paste environment: config:/Users/lch/work/adview/push/web/airpush/luchanghong.ini
	WSGI app 0 (mountpoint='') ready in 1 seconds on interpreter 0x7faad1c085f0 pid: 2673 (default app)
	*** uWSGI is running in multiple interpreter mode ***
	spawned uWSGI worker 1 (pid: 2673, cores: 1)
	spawned uWSGI worker 2 (pid: 2676, cores: 1)

b.通过 supervisorctl 命令来停止 supervisor

	(env_uwsgi)lch@LCH:~ $ supervisorctl -c /etc/supervisor/supervisord.conf 
	push_web_app                     RUNNING    pid 3023, uptime 0:05:31
	supervisor> ?
	default commands (type help topic):
	++++++++++++++++++++++++++++++++++++
	add    clear  fg        open  quit    remove  restart   start   stop  update 
	avail  exit   maintail  pid   reload  reread  shutdown  status  tail  version
	supervisor> stop push_web_app 
	push_web_app: stopped
	supervisor> start push_web_app 

也可以直接执行：

	lch@LCH:~ $ supervisorctl -c /etc/supervisor/supervisord.conf stop push_web_app
	push_web_app: stopped
	lch@LCH:~ $ supervisorctl -c /etc/supervisor/supervisord.conf start push_web_app
	push_web_app: started

在使用 supervisor 作为 daemonize 之后，它会自动监控 uWSGI ，如果手动停止 uWSGI ，supervisor 会帮你重启。

**问题 problem**

用 supervisorctl 停止当前的 program 之后，再 start 却出现了错误：

	lch@LCH:~ $ supervisorctl -c /etc/supervisor/supervisord.conf restart all
	push_web_app: ERROR (abnormal termination)

启动 supervisor 之后，用 supervisorctl 来停止一个 program 也很正常，但再次启动的时候就出错了，一直以为是 supervisor 的配置有问题，看一些 supervisor 的 log ：

	2012-09-11 11:29:58,226 INFO supervisord started with pid 951
	2012-09-11 11:29:59,230 INFO spawned: 'push_web_app' with pid 1203
	2012-09-11 11:29:59,288 INFO exited: push_web_app (exit status 1; not expected)
	2012-09-11 11:30:00,305 INFO spawned: 'push_web_app' with pid 1204
	2012-09-11 11:30:00,316 INFO exited: push_web_app (exit status 1; not expected)
	2012-09-11 11:30:02,320 INFO spawned: 'push_web_app' with pid 1205
	2012-09-11 11:30:02,331 INFO exited: push_web_app (exit status 1; not expected)
	2012-09-11 11:30:05,337 INFO spawned: 'push_web_app' with pid 1207
	2012-09-11 11:30:05,348 INFO exited: push_web_app (exit status 1; not expected)
	2012-09-11 11:30:06,350 INFO gave up: push_web_app entered FATAL state, too many start retries too quickly

不过配置文件怎么修改也不行，觉得还是 uwsgi 有问题，查看一下 uWSGI 的 log :

	*** Starting uWSGI 1.2.5 (64bit) on [Tue Sep 11 11:30:49 2012] ***
	compiled with version: 4.2.1 (Based on Apple Inc. build 5658) (LLVM build 2336.11.00) on 06 September 2012 14:23:41
	detected number of CPU cores: 4
	current working directory: /Users/lch
	detected binary path: /Users/lch/.pythonbrew/venvs/Python-2.6.7/env_uwsgi/bin/uwsgi
	your memory page size is 4096 bytes
	detected max file descriptor number: 2560 
	lock engine: OSX spinlocks
	probably another instance of uWSGI is running on the same address.
	bind(): Address already in use [socket.c line 751] 
	supervisor: error trying to setuid to 501 (Can't drop privilege as nonroot user)

倒数第二句看到了错误原因，于是把 supervisor 和 uwsgi 全部 kill 掉，再重新启动 supervisor，然后 stop ，通过 ps aux | grep uwsgi 发现居然还有一个 uwsgi process 没有结束掉，于是手动 sudo kill pid 结束这个进程，然后再通过 supervisorctl 启动，终于OK了。

到这里算是找到了问题的原因，也明确了解决方法：停止 supervisor 的时候结束所有的 uwsgi 进程，根源就是 uwsgi 启动时候的配置有问题。我给 uwsgi 配置的启动参数 workers 是 2 ，所有会启动 2 个 uwsgi process ，而通过 supervisorctl 停止的时候只会结束掉一个，那么肯定要有一个主进程来控制着他们了，不经意间看到 uwsgi 启动 log 里面一个 WARNING ：

	*** Starting uWSGI 1.2.5 (64bit) on [Tue Sep 11 10:53:17 2012] ***
	compiled with version: 4.2.1 (Based on Apple Inc. build 5658) (LLVM build 2336.11.00) on 06 September 2012 14:23:41
	detected number of CPU cores: 4
	current working directory: /Users/lch
	detected binary path: /Users/lch/.pythonbrew/venvs/Python-2.6.7/env_uwsgi/bin/uwsgi
	*** WARNING: you are running uWSGI without its master process manager ***

于是，我加了一个 --master 1 的参数，另外还要加一个参数 --no-orphans ，它的作用就是在结束掉 master process 之后也 kill 掉所有的 uwsgi process。修改完毕之后再次 kill 掉所有相关进程，然后再来一遍：

	supervisord ——> supervisorctl stop ——> supervisorctl start

一切正常，即时监控进程也都正常。