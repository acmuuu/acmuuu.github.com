---
layout: post
category : Linux
tags : [CentOS, OpenVPN]
title: CentOS上OpenVPN的安装与使用
---
{% include JB/setup %}

**一、安装准备**

    yum -y install openssl-devel openssl
    yum -y install gcc gcc-c++
 

**二、OpenVPN服务端安装过程**

**a.**lzo下载与安装

    cd /apps
    wget http://www.oberhumer.com/opensource/lzo/download/lzo-2.04.tar.gz
    tar zxvf lzo-2.04.tar.gz
    cd lzo-2.04
    ./configure ; make ; make install

**b.**openvpn下载与安装

    cd /apps
    wget http://openvpn.net/release/openvpn-2.1_rc15.tar.gz
    tar zxvf openvpn-2.1_rc15.tar.gz
    cd openvpn-2.1_rc15
    ./configure ; make ; make install

**c.**服务器端设置

    cp -r /apps/openvpn-2.1_rc15/ /etc/openvpn    用easy-rsa生成服务器证书客户端证书

**d.**初始化参数

    cd /etc/openvpn/easy-rsa/2.0
    ./vars
    source vars

**e.**生成CA证书

    ./clean-all
    ./build-ca

**f.**建立server key(一直回车）

    ./build-key-server server

**g.**生成diffie hellman参数

    ./build-dh

**h.**复制ca证书，服务端证书到OpenVPN配置目录

    cp keys/{ca.crt,ca.key,server.crt,server.key,dh1024.pem} /etc/openvpn/

**i.**生成client key

    ./build-key client1 与server key 设置一致

如要生成多个vpn账户，则与client1一样生成其他客户端证书如

    ./build-key client2
    ./build-key client3

**j.**生成客户端配置文件client1.ovpn

    vi /etc/openvpn/easy-rsa/2.0/keys/client1.ovpn
    
    client
    remote 192.168.80.129 1194
    dev tun 说明连接方式是点对点的连接，如要以以太网的方式则可以将tun修改为tap
    proto tcp
    resolv-retry infinite
    nobind
    persist-key
    persist-tun
    ca ca.crt
    cert client1.crt
    key client1.key
    ns-cert-type server
    comp-lzo
    route-delay 2
    route-method exe
    verb 3

**k.**打包客户端配置文件证书等

    tar czf keys.tgz ca.crt ca.key client1.crt client1.csr client1.key client1.ovpn
    mv keys.tgz /root

**l.**创建并编辑服务器端配置文件server.conf

    port 1194
    proto tcp
    dev tun 说明连接方式是点对点的连接，如要以以太网的方式则可以将tun修改为tap
    ca /etc/openvpn/easy-rsa/2.0/keys/ca.crt
    cert /etc/openvpn/easy-rsa/2.0/keys/server.crt
    key /etc/openvpn/easy-rsa/2.0/keys/server.key
    dh /etc/openvpn/easy-rsa/2.0/keys/dh1024.pem
    server 10.8.0.0 255.255.255.0
    ifconfig-pool-persist ipp.txt
    push "redirect-gateway"
    push "route 172.18.2.0 255.255.255.0" 路由转发到内网网段
    push "dhcp-option DNS 172.18.2.1"
    push "dhcp-option DNS 8.8.8.8"
    keepalive 10 120
    comp-lzo
    persist-key
    persist-tun
    client-to-client 如果不加则各个客户端之间将无法连接

**m.**对防火墙的相关设置

    echo 1 > /proc/sys/net/ipv4/ip_forward
    iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o venet0 -j MASQUERADE
    iptables-save > /etc/sysconfig/iptables
    sed -i 's/eth0/venet0/g' /etc/sysconfig/iptables  dirty vz fix for iptables-save
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

如果VPN服务器上的内网ip不是网关那么必须加上下面这一句（如果不加则客户端无法连接其他内网机器）：

    iptables -t nat -A POSTROUTING -s 10.8.0.0/255.255.255.0 -d 172.18.2.0/255.255.255.0 -j SNAT –to-source 172.18.2.30

**n.**启动openvpn

    /usr/local/sbin/openvpn --config /etc/openvpn/server.conf

如要设置开机启动则执行命令：

    echo “/usr/local/sbin/openvpn --config /etc/openvpn/server.conf ” >> /etc/rc.local

也可以做服务

    cp /apps/openvpn-2.1_rc15/sample-scripts/openvpn.init /etc/init.d/openvpn
    chmod 700 /etc/init.d/openvpn
    chkconfig --add openvpn
    chkconfig --level 345 openvpn on
    service openvpn start

**o.**查看是否安装成功

    lsof -i:1194
 

**注意：**以上是公司内网中有一台机器可以连接外网的情况，如果内网中都没有机器可连接外网，那么如果内网中该网段机器（假设为B子网网段为192.168.1.0/24）要想连接另一台也无外网ip的某个网段的机器(A ip为172.9.2.100)该怎么办呢？请往下看
找到一台可以随意设置的拥有外网ip的机器假设为C
将C设置成openVPN的服务器，然后将A和B设置为openVPN客户端
在C的配置文件中加上:

    client-to-client
    client-config-dir ccd
    route 192.168.1.0 255.255.255.0

B在ccd中的配置为：

    iroute 192.168.1.0 255.255.255.0

A在ccd中的配置为：

    push "route 192.168.1.0 255.255.255.0"

B的SNAT配置：

    iptables -t nat -A POSTROUTING -s 10.8.0.0/255.255.255.0 -d 192.168.1.0/255.255.255.0 -j SNAT –-to-source 172.9.2.100
 

**三、openvpn客户端安装(Windows)**