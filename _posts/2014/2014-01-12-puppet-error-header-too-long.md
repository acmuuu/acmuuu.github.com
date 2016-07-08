---
layout: post
category : Linux
tags : [Puppet]
title: Puppet Error header too long
---
{% include JB/setup %}
来自：[http://thejmlcontinuum.blogspot.jp/2013/02/puppet-error-header-too-long.html](http://thejmlcontinuum.blogspot.jp/2013/02/puppet-error-header-too-long.html)

If you're working with Puppet and you find that you get this error:

    puppet cert --list
    Error: header too long

Be mindful of your free space! I've now rolled out 20 servers or so in my puppet setup (soon to be duplicated to over 142 servers once I get these running right. All I'll have to do is spin up a new server, give it an IP and hostname and tell it where the Puppet Master is and Puppet will handle the rest!), and I've found that I'm starting to easily fill up the drive with old reports. Especially when re-running puppet syncs more frequently than the normal 30 min run-interval. I started getting the above error with a lot of various puppet commands, the simplest one, just trying to list certs. Then I checked a "df -h":

    # df -h
    Filesystem            Size  Used Avail Use% Mounted on
    /dev/sda1              16G   15G     0 100% /

Oops! Using the following script I was able to clean up old reports easily. Set the "days" variable to as high as you want for your setup. I'm using Puppet Dashboard to pull in reports to a DB, so I don't need to keep the yaml's around too long.

    #!/bin/sh
    days="+1"       # more than a day old

    for d in `find /var/lib/puppet/reports -mindepth 1 -maxdepth 1 -type d`
    do
            find $d -type f -name \*.yaml -mtime $days |
            sort -r |
            tail -n +2 |
            xargs /bin/rm -f
    done

In my case, since it tried to sync a new server ssl cert while the drive was full, the error came out to be due to not only the free space, but a corrupt cert. To find the offending cert and fix the issue, you'll need to look through the /var/lib/puppet dir for the file. The host I was looking for is 'betamem.example.com' and I found it like this:

    # cd /var/lib/puppet
    # find ./|grep betamem
    ./ssl/ca/requests/betamem.example.com

I then removed the cert (held in /var/lib/puppet/ssl/certificate_requests/) from the agent on 'betamem' and told it to try again by cycling it's puppet agent.

    # rm -f /var/lib/puppet/ssl/certificate_requests/*
    # /etc/init.d/puppet restart
    Stopping puppet agent:                                     [  OK  ]
    Starting puppet agent:                                     [  OK  ]

Tailing /var/log/messages on the master shows it's got a new request, so let's sign it:

    # tail /var/log/messages -n1
    puppet-master[22486]: betamem.example.com has a waiting certificate request
    # puppet cert --sign betamem.example.com
    Signed certificate request for betamem.example.com
    Removing file Puppet::SSL::CertificateRequest at '/var/lib/puppet/ssl/ca/requests/betamem.example.com.pem'

Go back to the puppet agent and cycle it again, or just wait until the next run-interval and it should be back to normal!
