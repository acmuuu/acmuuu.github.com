---
layout: post
category : Greenplum
tags : [Greenplum, Error]
title: DTM initialization failure during startup
---
{% include JB/setup %}
初始化Greenplum的时候报如下错误：

	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-Process results...
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-----------------------------------------------------
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:- Successful segment starts = 2
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:- Failed segment starts = 0
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:- Skipped segment starts (segments are marked down in configuration) = 0
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-----------------------------------------------------
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-Successfully started 2 of 2 segment instances
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-----------------------------------------------------
	20111017:14:52:03:gpstart:rhel:gpadmin-[INFO]:-Starting Master instance rhel.*******.com directory /data/master/gpseg-1
	20111017:14:52:04:gpstart:rhel:gpadmin-[INFO]:-Command pg_ctl reports Master rhel.*******.com instance active
	20111017:14:52:05:gpstart:rhel:gpadmin-[WARNING]:-Encountered problem while connecting to master: FATAL: DTM initialization: failure during startup/recovery, retry failed, check segment status (cdbtm.c:1351)

	20111017:14:52:05:gpstart:rhel:gpadmin-[INFO]:-Database successfully started with no errors reported
	20111017:14:52:05:gpinitsystem:rhel:gpadmin-[INFO]:-Completed restart of Greenplum instance in production mode
	20111017:14:52:05:gpinitsystem:rhel:gpadmin-[INFO]:-Loading gp_toolkit...
	psql: FATAL: DTM initialization: failure during startup/recovery, retry failed, check segment status (cdbtm.c:1351)
	20111017:14:52:17:gpinitsystem:rhel:gpadmin-[FATAL]:-Failed to retrieve rolname. Script Exiting!
	
后来查明错误是由iptables造成的：[http://www.greenplum.com/communities/forums/showthread.php?523-DTM-Initialization-Error](http://www.greenplum.com/communities/forums/showthread.php?523-DTM-Initialization-Error)