---
layout: post
category : OpenWrt
tags : [OpenWrt, LuCI]
title: OpenWrt offline install LuCI
---
{% include JB/setup %}
**a.首先去 [http://downloads.openwrt.org/snapshots/trunk/ar71xx/packages/](http://downloads.openwrt.org/snapshots/trunk/ar71xx/packages/) 下载LuCI需要的包**

    liblua_5.1.5-1_ar71xx.ipk
    libubus-lua_2012-12-15-bb856ad8a9a1e786494d01e34bbfe2b4d2134021_ar71xx.ipk
    libuci-lua_2012-03-28.1-1_ar71xx.ipk
    lua_5.1.5-1_ar71xx.ipk
    luci-i18n-english_trunk+svn9570-1_ar71xx.ipk
    luci-lib-core_trunk+svn9570-1_ar71xx.ipk
    luci-lib-ipkg_trunk+svn9570-1_ar71xx.ipk
    luci-lib-nixio_trunk+svn9570-1_ar71xx.ipk
    luci-lib-sys_trunk+svn9570-1_ar71xx.ipk
    luci-lib-web_trunk+svn9570-1_ar71xx.ipk
    luci-mod-admin-core_trunk+svn9570-1_ar71xx.ipk
    luci-mod-admin-full_trunk+svn9570-1_ar71xx.ipk
    luci-proto-core_trunk+svn9570-1_ar71xx.ipk
    luci-sgi-cgi_trunk+svn9570-1_ar71xx.ipk
    luci-theme-base_trunk+svn9570-1_ar71xx.ipk
    luci-theme-openwrt_trunk+svn9570-1_ar71xx.ipk
    uhttpd_2012-10-30-e57bf6d8bfa465a50eea2c30269acdfe751a46fd_ar71xx.ipk
    
**b.想办法上传到OpenWrt**

由于没有安装sftp-server，所以我们通过sftp上传似乎不通，我最后的办法是把这些包下载到连接到OpenWrt的电脑本地的一个目录，之后：

    D:\luci-offline-packages>python27 -m SimpleHTTPServer
    
在本地搭建一个简易的web服务器，luci-offline-packages目录为根目录，之后再用wget下载(我LAN的IP段是10.10.0.%，网关10.10.0.1，电脑10.10.0.247)：

    wget http://10.10.0.247:8000/luci-i18n-english_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-lib-core_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-lib-ipkg_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-lib-nixio_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-lib-sys_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-lib-web_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-mod-admin-core_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-mod-admin-full_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-proto-core_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-sgi-cgi_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-theme-base_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/luci-theme-openwrt_trunk+svn9570-1_ar71xx.ipk
    wget http://10.10.0.247:8000/libubus-lua_2012-12-15-bb856ad8a9a1e786494d01e34bbfe2b4d2134021_ar71xx.ipk
    wget http://10.10.0.247:8000/lua_5.1.5-1_ar71xx.ipk
    wget http://10.10.0.247:8000/libuci-lua_2012-03-28.1-1_ar71xx.ipk
    wget http://10.10.0.247:8000/liblua_5.1.5-1_ar71xx.ipk
    wget http://10.10.0.247:8000/uhttpd_2012-10-30-e57bf6d8bfa465a50eea2c30269acdfe751a46fd_ar71xx.ipk

Python的SimpleHTTPServer日志如下：

    Serving HTTP on 0.0.0.0 port 8000 ...
    OpenWrt.lan - - [01/Jan/2013 15:52:28] "GET /luci* HTTP/1.1" 404 -
    OpenWrt.lan - - [01/Jan/2013 15:53:29] "GET /luci-i18n-english_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:33] "GET /luci-lib-core_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:38] "GET /luci-lib-ipkg_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:42] "GET /luci-lib-nixio_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:46] "GET /luci-lib-sys_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:49] "GET /luci-lib-web_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:52] "GET /luci-mod-admin-core_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:56] "GET /luci-mod-admin-full_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:53:59] "GET /luci-proto-core_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:54:02] "GET /luci-sgi-cgi_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:54:06] "GET /luci-theme-base_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:54:07] "GET /luci-theme-openwrt_trunk+svn9570-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:57:29] "GET /libubus-lua_2012-12-15-bb856ad8a9a1e786494d01e34bbfe2b4d2134021_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:57:51] "GET /lua_5.1.5-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:58:19] "GET /libuci-lua_2012-03-28.1-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 15:59:20] "GET /liblua_5.1.5-1_ar71xx.ipk HTTP/1.1" 200 -
    OpenWrt.lan - - [01/Jan/2013 16:02:18] "GET /uhttpd_2012-10-30-e57bf6d8bfa465a50eea2c30269acdfe751a46fd_ar71xx.ipk HTTP/1.1" 200 -
    
**c.安装所有包：**

    opkg install *
    
**d.启动httpd服务：**

    /etc/init.d/uhttpd enable
    /etc/init.d/uhttpd start

通过 http://10.10.0.1 访问LuCI。
