---
layout: post
category : Linux
tags : [Python, CentOS, Git]
title: CentOS 编译安装 PyCrypto
---
{% include JB/setup %}
**来自：[http://bugcharmer.blogspot.com/2012/07/building-pycrypto-on-amazon-ec2.html](http://bugcharmer.blogspot.com/2012/07/building-pycrypto-on-amazon-ec2.html)**

**Step 1 - Install gcc/make**

	$ sudo yum install gcc
	$ sudo yum install make

That was easy.

**Step 2 - Install the GNU MP Arithmetic Library**

	$ wget ftp://ftp.gmplib.org/pub/gmp-5.0.5/gmp-5.0.5.tar.bz2
	$ bunzip2 gmp-5.0.5.tar.bz2
	$ cd gmp-5.0.5
	$ sudo ./configure
	$ sudo make
	$ sudo make check
	$ sudo make install
	$ cd 

Still not too bad.

**Step 3 - Install MPIR**

	$ wget http://www.mpir.org/mpir-2.5.1.tar.bz2
	$ bunzip mpir-2.5.1.tar.bz2
	$ cd mpir-2.5.1
	$ sudo ./configure
	$ sudo make
	$ sudo make check
	$ sudo make install 
	$ cd

Everything worked up through here.

Intermission

There are two problems you'll run into if you try to build PyCrypto at this point: errors from missing header files and, once you resolve those, runtime errors complaining about an undefined symbol for rpl_malloc.  Let's fix that.

**Step 4 - Install the Python development headers**

	$ sudo yum install python-devel

Easy fix.

**Step 5 - Download PyCrypto**

	$ wget http://ftp.dlitz.net/pub/dlitz/crypto/pycrypto/pycrypto-2.6.tar.gz 
	$ tar xzvf pycrypto-2.6.tar.gz
	$ cd pycrypto-2.6

**Step 6 - Edit the configure script**

	$ [favorite editor] configure

Find the this section of the script (I added line numbers):

	3865:   if test $ac_cv_func_malloc_0_nonnull = yes; then:
	3866:  
	3867:   $as_echo "#define HAVE MALLOC 1" >> confdefs.h
	3868:  
	3869:   else
	3870:       $as_echo "define HAVE_MALLOC 0" >> confdefs.h
	3871: 
	3872:   case " $LIBOBJS " in
	3873:   *" malloc.$ac_objext "* ) ;;
	3874:   *) LIBOBJS = "$LIBOBJS malloc.$ac_objext"
	3875:  ;;
	3876:  esac
	3877:
	3878; 
	3879:  $as_echo "define malloc rpl_malloc" >>confdefs.h
	3880:
	3881:  fi
  
Keep line 3867, but comment out the rest.  Save and exit.

**or**

	$ export ac_cv_func_malloc_0_nonnull=yes

The problem is that when you try to build PyCrypto, autotools thinks that we're using rpl_malloc instead of malloc.  I'm not sure how to fix this problem the right way, but this hack will get rid of the check and just have it use malloc.  If someone knows the right way to fix this, please say something in the comments and I'll update this post.

否则会有如下错误：

	ImportError: /usr/local/lib/python2.6/dist-packages/pycrypto-2.6-py2.6-linux-x86_64.egg/Crypto/Cipher/_AES.so: undefined symbol: rpl_malloc

**Step 7 - Build PyCrypto**

	$ python setup.py build
	$ sudo python.setup.py install

**Step 8 - Test PyCrypto**

	$ python
	>>> from Crypto.Cipher import AES

If this works, you should be good to go.

If it fails, you did something wrong.  You can either rm -r pycrypto-2.6 and re-extract the archive or just rm -r the build folder then grep for anything that says "rpl_malloc" and comment it out.  Also edit config.status and change 'D["HAVE_MALLOC"]=" 0"' to say '=" 1"'.  This is what I did the first time, but when I decided to write this up I started over to try to get it right from the start.

Have fun.