---
layout: post
category : Linux
tags : [XFS, Ext3]
title: XFS, ext and per-inode mutexes
---
{% include JB/setup %}

**来自[http://www.facebook.com/note.php?note_id=10150210901610933](http://www.facebook.com/note.php?note_id=10150210901610933)**

I still don't think this is widely known. It should be. ext-2 and ext-3 lock a per-inode mutex for the duration of a write. This means that ext-2 and ext-3 do not allow concurrent writes to a file and that can prevent you from getting the write throughput you expect when you stripe a file over several disks with RAID. XFS does not do this which is one of the reasons many people prefer XFS for InnoDB. I don't know whether ext-4 does this.
 
Depending on what caches are enabled in your storage, this can have reduce disk write throughput. Even when you have a battery backed write cache, unless the batteries can be hot-swapped, it is likely that at some point in time your server will run in production with the RAID write cache disabled.
  
I have a test server that uses HW RAID 10 with disk caches disabled. I disabled the battery backed write cache on HW RAID and ran sysbench fileio tests using ext-3 and XFS. The server uses CentOS 5.2. The numbers below repeat results I gathered a few years ago after browsing ext-2 source code to confirm the behavior.
   
**Writes-per-second**

    threads     1     2      4      8
    xfs         162   294    501    800
    ext-3       161   162    161    165
    
**Notes**
     
Script to run sysbench. It was run for 1, 2, 4 and 8 threads for 30 seconds.

    nt=$1
    secs=$2
    args=$3

    ./sysbench --test=fileio --file-num=1 --file-total-size=4GB \
         --file-test-mode=rndwr --max-requests=0  \
         --file-fsync-freq=0 --file-extra-flags=direct \
         --num-threads=${nt} --max-time=${secs} ${args}
