---
layout: post
category : Linux
tags : [Puppet, Nginx, Ruby]
title: Using Nginx and Passenger to Power Your Puppet Master
---
{% include JB/setup %}
**来自[http://z0mbix.github.io/blog/2012/03/01/use-nginx-and-passenger-to-power-your-puppet-master/](http://z0mbix.github.io/blog/2012/03/01/use-nginx-and-passenger-to-power-your-puppet-master/)**

Where I work, we use Nginx wherever possible, so when it came to setting up a new Puppet Master I headed to the puppet docs only to find outdated docs on doing this. Most docs are centred around using Apache with Passenger. After much Googling, I found that not many people are doing this, or if they are, they haven’t documented it. This post documents the steps required to get this all running, and is based around doing so using RHEL or CentOS 5.x.

The version of Ruby that is included with Red Hat/CentOS 5.x is ancient, and should not be used. You should start with at least Ruby 1.8.7 (Plus Rubygems) or 1.9.2. See the Puppet Labs FAQ for details on the best version to use.I recommend you use the FrameOS repo that provides Ruby 1.8.7:

    # rpm -Uvh http://rbel.frameos.org/rbel5

Install Ruby and Rubygems:

Now that’s out the way, let’s install puppet and puppet-server from yum.puppetlabs.com. You need to add the Puppet Labs yum repo which creates the file /etc/yum.repos.d/puppetlabs.repo file:

    # rpm -ivh http://yum.puppetlabs.com/el/5/products/x86_64/puppetlabs-release-5-1.noarch.rpm

Now install Puppet:

    # yum install -y puppet puppet-server

Install some dependency requirements to compile nginx:

    # yum install -y gcc make pcre-devel zlib-devel openssl-devel pam-devel curl-devel rpm-build

You’ll probably want git at some stage too, so it’s easiest to add the EPEL repository and get it from there.

Install rake, rack and passenger ruby gems:

    # gem install rake rack passenger --no-rdoc --no-ri

As nginx does not support dynamic module loading like Apache, and the official nginx RPMs provided by nginx.org are not compiled with Passenger suppport, we need to build nginx from source. I am not using the modrails.com yum repo to install the passenger enabled nginx as it relies on the default Ruby 1.8.5 and I don’t wish to use such an old version of Ruby. I’m also not using 1.9.2 as the Puppet Labs puppet packages are dependant on Ruby 1.8.x. If you wish to use Ruby 1.9.x, just install puppet as a gem (gem install puppet). This doesn’t setup the puppet user or install the RHEL/CentOS init script.

Download nginx latest stable source (Currently v1.0.12):

    # wget http://nginx.org/download/nginx-1.0.12.tar.gz

Unpack it and move into the new directory:

    # tar xvzf nginx-1.0.12.tar.gz
    # cd nginx-1.0.12

Configure nginx, and add the passenger module:

    # ./configure \
          --prefix=/opt/nginx \
          --conf-path=/etc/nginx/nginx.conf \
          --pid-path=/var/run/nginx.pid \
          --error-log-path=/var/log/nginx/error.log \
          --http-log-path=/var/log/nginx/access.log \
          --with-http_ssl_module \
          --with-http_gzip_static_module \
          --add-module=`passenger-config --root`/ext/nginx

This should end up with something similar to:

    configuring additional modules
    adding module in /usr/lib/ruby/gems/1.8/gems/passenger-3.0.11/ext/nginx
    checking for Math library ... found
     + ngx_http_passenger_module was configured
    checking for PCRE library ... found
    checking for OpenSSL library ... found
    checking for zlib library ... found
    creating objs/Makefile

    Configuration summary
      + using system PCRE library
      + using system OpenSSL library
      + md5: using OpenSSL library
      + sha1: using OpenSSL library
      + using system zlib library

      nginx path prefix: "/opt/nginx"
      nginx binary file: "/opt/nginx/sbin/nginx"
      nginx configuration prefix: "/etc/nginx"
      nginx configuration file: "/etc/nginx/nginx.conf"
      nginx pid file: "/var/run/nginx.pid"
      nginx error log file: "/var/log/nginx/error.log"
      nginx http access log file: "/var/log/nginx/access.log"
      nginx http client request body temporary files: "client_body_temp"
      nginx http proxy temporary files: "proxy_temp"
      nginx http fastcgi temporary files: "fastcgi_temp"
      nginx http uwsgi temporary files: "uwsgi_temp"
      nginx http scgi temporary files: "scgi_temp"

It’s a good idea to build a RPM for nginx so you can quickly deploy it to other pupper servers. To do this I’m going to use Jordan Sissel’s superb fpm.

Let’s install the fpm rubygem:

    # gem install fpm --no-rdoc --no-ri

Create a temporary location to create the RPM package:

    # mkdir /tmp/installdir
    # make
    # make install DESTDIR=/tmp/installdir

Make some additional directories to add extra files to the RPM we are about to build:

    # mkdir -p /tmp/installdir/etc/{sysconfig,rc.d/init.d,nginx/conf.d}

Next, you need an nginx init script. I created one based on the one from the nginx wiki and updated it with correct paths and removed the auto user creation stuff. I won’t paste the whole thing here, but you can download it (and all the other files) from my GitHub repo:

    # curl -L https://raw.github.com/z0mbix/puppet-master-nginx-passenger/master/etc/rc.d/init.d/nginx -o /tmp/installdir/etc/rc.d/init.d/nginx

Make it executable:

    # chmod 755 /tmp/installdir/etc/rc.d/init.d/nginx

Create the nginx sysconfig file /tmp/installdir/etc/sysconfig/nginx containing:

    # Configuration file for the nginx service.
    NGINX=/opt/nginx/sbin/nginx
    CONFFILE=/etc/nginx/nginx.conf
    LOCKFILE=/var/lock/subsys/nginx

Make it executable:

    # chmod 755 /tmp/installdir/etc/sysconfig/nginx

Go home:
  
    # cd ~

Create the RPM package:

    # fpm -s dir \
      -t rpm \
      -n nginx-passenger \
      -v 1.0.12 \
      -C /tmp/installdir \
      -m "David Wooldridge <zombie@zombix.org>" \
      --url "http://nginx.org/" \
      --description "Nginx with the passenger module" \
      etc opt var

This should drop a nice new RPM in cwd called nginx-passenger-1.0.12-1.x86_64.rpm.

You can now install the RPM:

    # rpm -ivh nginx-passenger-1.0.12-1.x86_64.rpm 
    Preparing...                ########################################### [100%]
       1:nginx-passenger        ########################################### [100%]

Create rack directory structure:

    # mkdir -p /etc/puppet/rack/public

Copy rackup file to the correct place:

    # cp /usr/share/puppet/ext/rack/files/config.ru /etc/puppet/rack/

Set the correct permissions, this is important:

    # chown -R puppet:puppet /etc/puppet/rack/

Create the main nginx configuration file /etc/nginx/nginx.conf:

    user  nginx;
    worker_processes  1;

    error_log  /var/log/nginx/error.log warn;
    pid        /var/run/nginx.pid;

    events {
        worker_connections  1024;
    }

    http {
        include       /etc/nginx/mime.types;
        default_type  application/octet-stream;

        log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                          '$status $body_bytes_sent "$http_referer" '
                          '"$http_user_agent" "$http_x_forwarded_for"';

        access_log  /var/log/nginx/access.log  main;

        sendfile        on;
        tcp_nopush      on;

        keepalive_timeout  65;

        # Passenger needed for puppet
        passenger_root  /usr/lib/ruby/gems/1.8/gems/passenger-3.0.11;
        passenger_ruby  /usr/bin/ruby;
        passenger_max_pool_size 15;

        include /etc/nginx/conf.d/*.conf;
    }

Make sure the passenger_root is set to whatever is returned by:

    # passenger-config --root

The passenger configuration is taken from the Suggested Tweaks section of the Puppet Labs Apache/Passenger document found here and adapted for Nginx using the Passenger Nginx user guide found here. The defaults are all acceptable apart from passenger_max_pool_size which by default is only 6. This sets the maximum number of rack application instances that can be simultaneously active. I’m presuming you won’t be running your puppet master on less than 1GB of RAM, so setting this to 15. Adjust this to suit your hardware/RAM.

Also, if you have installed Ruby any where else, update passenger_ruby. Feel free to update worker_processes for your hardware.

Create the nginx puppet server config /etc/nginx/conf.d/puppet.conf:

    server {
      listen                     8140 ssl;
      server_name                puppet puppet.example.com;

      passenger_enabled          on;
      passenger_set_cgi_param    HTTP_X_CLIENT_DN $ssl_client_s_dn; 
      passenger_set_cgi_param    HTTP_X_CLIENT_VERIFY $ssl_client_verify; 

      access_log                 /var/log/nginx/puppet_access.log;
      error_log                  /var/log/nginx/puppet_error.log;

      root                       /etc/puppet/rack/public;

      ssl_certificate            /etc/puppet/ssl/certs/puppet.example.com.pem;
      ssl_certificate_key        /etc/puppet/ssl/private_keys/puppet.example.com.pem;
      ssl_crl                    /etc/puppet/ssl/ca/ca_crl.pem;
      ssl_client_certificate     /etc/puppet/ssl/certs/ca.pem;
      ssl_ciphers                SSLv2:-LOW:-EXPORT:RC4+RSA;
      ssl_prefer_server_ciphers  on;
      ssl_verify_client          optional;
      ssl_verify_depth           1;
      ssl_session_cache          shared:SSL:128m;
      ssl_session_timeout        5m;
    }

Create the puppet configuration file /etc/puppet/puppet.conf:

    [main]

    [agent]
      server = puppet.example.com

    [master]
      certname = puppet.example.com

Turn puppet master off as it doesn’t need to run standalone:

    # chkconfig puppetmaster off

Run a stand-alone puppet master to generate/sign certs etc.

    # puppet master --no-daemonize --verbose
    info: Creating a new SSL key for puppet.example.com
    info: Creating a new SSL certificate request for puppet.example.com
    info: Certificate Request fingerprint (md5): 04:AA:81:9E:49:B9:CA:2B:FD:D0:32:1B:69:CC:3E:B4
    notice: puppet.example.com has a waiting certificate request
    notice: Signed certificate request for puppet.example.com
    notice: Removing file Puppet::SSL::CertificateRequest puppet.example.com at '/etc/puppet/ssl/ca/requests/puppet.example.com.pem'
    notice: Removing file Puppet::SSL::CertificateRequest puppet.example.com at '/etc/puppet/ssl/certificate_requests/puppet.example.com.pem'
    notice: Starting Puppet master version 2.7.11

Hit Ctrl+c to stop the stand-alone puppet master. You can see above that this has created a SSL key and certificate request, then signed this certificate request.

Add an nginx user:

    # adduser nginx

Enable nginx

    # chkconfig nginx on

Make sure everything looks good:

    # service nginx configtest

If so, away you go:

    # service nginx start

Now test a puppet agent run on the master:

    # puppet agent --server puppet --onetime --no-daemonize --verbose --noop
    info: Caching catalog for puppet.example.com
    info: Applying configuration version '1330615281'
    notice: Finished catalog run in 0.04 seconds

One drawback of using nginx and passenger to front your Puppet master is that when there is a passenger upgrade, you will need to recompile nginx against the new passenger version and build a new RPM. Fortunately, because you are now running puppet and have been converted to fpm, this should be a trivial task, and not something you will need to do very often.
