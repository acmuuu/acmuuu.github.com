---
layout: post
category : Docker
tags : [Docker, Container, Ubuntu]
title: 在Ubuntu容器中运行sshd做日常Linux环境使用
---
{% include JB/setup %}
**MacOS安装Docker相关**

    brew cask install docker
    brew install bash-completion
    brew install docker-completion
    brew install docker-compose-completion
    brew install docker-machine-completion

**MacOS启动Ubuntu容器**

    docker run -d ubuntu

**MacOS进入容器**

    docker ps
    docker exec -it 90cc4cac42fa /bin/bash


**Ubuntu更新apt源为aliyun的**

    cat > /etc/apt/sources.list <<EOF
    deb http://mirrors.aliyun.com/ubuntu/ bionic main restricted universe multiverse
    deb http://mirrors.aliyun.com/ubuntu/ bionic-security main restricted universe multiverse
    deb http://mirrors.aliyun.com/ubuntu/ bionic-updates main restricted universe multiverse
    deb http://mirrors.aliyun.com/ubuntu/ bionic-proposed main restricted universe multiverse
    deb http://mirrors.aliyun.com/ubuntu/ bionic-backports main restricted universe multiverse
    deb-src http://mirrors.aliyun.com/ubuntu/ bionic main restricted universe multiverse
    deb-src http://mirrors.aliyun.com/ubuntu/ bionic-security main restricted universe multiverse
    deb-src http://mirrors.aliyun.com/ubuntu/ bionic-updates main restricted universe multiverse
    deb-src http://mirrors.aliyun.com/ubuntu/ bionic-proposed main restricted universe multiverse
    deb-src http://mirrors.aliyun.com/ubuntu/ bionic-backports main restricted universe multiverse
    EOF

**Ubuntu安装必要的软件和sshd**

    apt update
    apt upgrade

    apt-get install openssh-server openssh-client
    apt-get install vim
    apt-get install iputils-ping
    apt-get install net-tools
    apt-get install iftop

**Ubuntu修改允许root登陆相关信息**

    vim /etc/ssh/sshd_config

**MacOS上提交容器并重新启动容器**

    docker commit 90cc4cac42fa ubuntu-sshd
    docker stop 90cc4cac42fa
    docker run -d -p 222:22 ubuntu-sshd

**Ubuntu启动sshd服务**

    docker ps
    docker exec -it e6bdfd94e957 /bin/bash
    service sshd start

**MacOS上通过ssh登陆容器**

    ssh root@127.0.0.1 -p222
    ssh root@192.168.123.321 -p222

