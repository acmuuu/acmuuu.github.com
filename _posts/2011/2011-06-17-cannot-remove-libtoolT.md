---
layout: post
category : MySQL
tags : [MySQL, Install, Error]
title: cannot remove libtoolT
---
{% include JB/setup %}

安装mysql时报错：/bin/rm: cannot remove libtoolT: No such file or directory

    config.status: creating support-files/Makefile
    config.status: creating support-files/MacOSX/Makefile
    config.status: creating support-files/RHEL4-SElinux/Makefile
    config.status: creating server-tools/Makefile
    config.status: creating server-tools/instance-manager/Makefile
    config.status: creating cmd-line-utils/Makefile
    config.status: creating cmd-line-utils/libedit/Makefile
    config.status: creating libmysqld/Makefile
    config.status: creating libmysqld/examples/Makefile
    config.status: creating mysql-test/Makefile
    config.status: creating mysql-test/lib/My/SafeProcess/Makefile
    config.status: creating netware/Makefile
    config.status: creating sql-bench/Makefile
    config.status: creating include/mysql_version.h
    config.status: creating plugin/Makefile
    config.status: creating win/Makefile
    config.status: creating include/config.h
    config.status: executing depfiles commands
    config.status: executing libtool commands
    /bin/rm: cannot remove libtoolT: No such file or directory
    config.status: executing default commands

    Thank you for choosing MySQL!

    Remember to check the platform specific part of the reference manual
    for hints about installing MySQL on your platform.
    Also have a look at the files in the Docs directory.
 
查看INSTALL-SOURCE发现如下内容

       On Unix/Linux, use the autoconf system to create the configure
       script so that you can configure the build environment before
       building. The following example shows the typical commands
       required to build MySQL from a source tree.

        1. Change location to the top-level directory of the source tree;
           replace mysql-5.1 with the appropriate directory name.
    shell> cd mysql-5.1

        2. Prepare the source tree for configuration.
           Prior to MySQL 5.1.12, you must separately configure the
           InnoDB storage engine. Run the following command from the main
           source directory:
    shell> (cd storage/innobase; autoreconf --force --install)
           You can omit the previous command for MySQL 5.1.12 and later,
           or if you do not require InnoDB support.
           Prepare the remainder of the source tree:
    shell> autoreconf --force --install
           As an alternative to the preceding autoreconf command, you can
           use BUILD/autorun.sh, which acts as a shortcut for the
           following sequence of commands:
    shell> aclocal; autoheader
    shell> libtoolize --automake --force
    shell> automake --force --add-missing; autoconf
           If you get some strange errors during this stage, verify that
           you have the correct version of libtool installed.

        3. Configure the source tree and compile MySQL:
    shell> ./configure  # Add your favorite options here
    shell> make
           For a description of some configure options, see Section
           2.3.2, "Typical configure Options."
           A collection of our standard configuration scripts is located
           in the BUILD/ subdirectory. For example, you may find it more
           convenient to use the BUILD/compile-pentium-debug script than
           the preceding set of shell commands. To compile on a different
           architecture, modify the script by removing flags that are
           Pentium-specific, or use another script that may be more
           appropriate. These scripts are provided on an "as-is" basis.
           They are not officially maintained and their contents may
           change from release to release.

        4. When the build is done, run make install. Be careful with this
           on a production machine; the command may overwrite your live
           release installation. If you already have MySQL installed and
           do not want to overwrite it, run ./configure with values for
           the --prefix, --with-tcp-port, and --with-unix-socket-path
           options different from those used for your production server.

        5. Play hard with your new installation and try to make the new
           features crash. Start by running make test. See Section
           22.1.2, "MySQL Test Suite."

        6. If you have gotten to the make stage, but the distribution
           does not compile, please enter the problem into our bugs
           database using the instructions given in Section 1.7, "How to
           Report Bugs or Problems." If you have installed the latest
           versions of the required GNU tools, and they crash trying to
           process our configuration files, please report that also.
           However, if you get a command not found error or a similar
           problem for aclocal, configure, or other required tools, do
           not report it. Instead, make sure that all the required tools
           are installed and that your PATH variable is set correctly so
           that your shell can find them.
 
也就是执行

    autoreconf --force --install
    aclocal; autoheader
    libtoolize --automake --force
    automake --force --add-missing; autoconf
 
网上也有说先安装automake和libtool

    yum -y install autoconf
    yum -y install automake
    yum -y install libtool
