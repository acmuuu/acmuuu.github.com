---
layout: post
category : MySQL
tags : [MySQL, InnoDB]
title: 如何分析crash的backtrace
---
{% include JB/setup %}
**来自[http://www.taobaodba.com/html/1598_如何分析crash的backtrace.html](http://www.taobaodba.com/html/1598_如何分析crash的backtrace.html)**

MySQL异常退出往往会会在error.log中打印backtrace信息，我们从这个backtrace中可以得到一些异常的原因，例如断言错误，空指针内容的访问等。顺着这些信息排查，我们一般再结合代码逻辑来做推断，写测试用例重现，再打补丁，再验证等过程。

但是，线上早期部署的MySQL编译参数不太规范，导致一些MySQL crash的backtrace看起来不是那么透明，非常难懂，甚至一点意义也没有。这给我们排查问题带来非常大的不便。当然，这个问题已经解决，我们采用google-breakpad来获取MySQL crash时的mini-dump，但这是后话，在此不展开。

那么，这种backtrace就真的没有什么信息可以挖掘吗？不一定。下面我们就以这周发线上的一个故障来分析。

线上一台5.5版本的备库跑了3月之久突然就crash，crash的backtrace为：

	/u01/mysql/bin/mysqld(my_print_stacktrace+0x39)[0x7b1b69]
	/u01/mysql/bin/mysqld(handle_segfault+0x43c)[0x4fa39c]
	/lib64/libpthread.so.0[0x344dc0f520]
	/u01/mysql/bin/mysqld[0x7fb4c1]
	/lib64/libpthread.so.0[0x344dc077e1]
	/lib64/libc.so.6(clone+0x6d)[0x344d8e68ed

这个backtrace就是典型早期编译部署的MySQL,backtrace信息很难看懂。但是，凭经验和一些常识，这一个调用关系非常简单的线程，因为backtrace中创建的pthread只调用了一次mysqld的函数。那么，我猜测这个线程可能是一个后台线程。mysqld层显示的地址0x7fb4c1到底是哪行代码，对我们分析问题非常关键。

猜测后就该验证了，GDB出马！用GDB在出问题的那台机器上来玩转下反汇编。注意：

	1. 不要在业务高峰期执行GDB相关操作！
	2. 一定要对所执行的GDB动作非常熟悉！
	3. 最好通知对应的DBA！

那末，搞起！在线disass下地址0x7fb4c1先看看是哪个函数：

	gdb -p 31639 -ex "disassemble 0x7fb4c1 " --ex "quit" --batch > /tmp/g1.log

	Dump of assembler code from 0x7fb4c1 to 0x7fb4f1:
	0x00000000007fb4c1 <srv_master_thread+5217>: cmp %esi,(%rax)
	0x00000000007fb4c3 <srv_master_thread+5219>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4c5 <srv_master_thread+5221>: mov 0xc(%r8),%edi
	0x00000000007fb4c9 <srv_master_thread+5225>: cmp 0x4(%rax),%edi
	0x00000000007fb4cc <srv_master_thread+5228>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4ce <srv_master_thread+5230>: mov 0x60(%rax),%rdi
	0x00000000007fb4d2 <srv_master_thread+5234>: cmp %rdi,0x10(%r11)
	0x00000000007fb4d6 <srv_master_thread+5238>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4d8 <srv_master_thread+5240>: nopl 0x0(%rax,%rax,1)
	0x00000000007fb4e0 <srv_master_thread+5248>: sub %r13,%rdx
	0x00000000007fb4e3 <srv_master_thread+5251>: add (%r11),%rdx
	0x00000000007fb4e6 <srv_master_thread+5254>: mov $0x0,%eax
	0x00000000007fb4eb <srv_master_thread+5259>: mov %r13,(%r11)
	0x00000000007fb4ee <srv_master_thread+5262>: mov (%r12),%esi
	End of assembler dump.

有两点我们可以确认：

	1. 这是个srv_master_thread线程.
	2. 在读取异常指针作比较时，导致segfault.

那这段汇编代码上下文是什么很难看出到底是哪行代码出问题，这时我们可以把srv_master_thread函数disass下：

	gdb -p 31639 -ex "disassemble srv_master_thread" --ex "quit" --batch > /tmp/g2.log

	0x00000000007fb478 <+5144>: mov 0x3a8(%r10),%r12
	0x00000000007fb46d <+5133>: mov %r12,-0x740(%rbp)
	0x00000000007fb474 <+5140>: nopl 0x0(%rax)
	0x00000000007fb486 <+5158>: test %r12,%r12
	0x00000000007fb489 <+5161>: je 0x7fb908 <srv_master_thread+6312>
	0x00000000007fb48f <+5167>: lea (%r9,%r9,2),%rdi
	0x00000000007fb493 <+5171>: mov %r12,%rax
	0x00000000007fb496 <+5174>: xor %edx,%edx
	0x00000000007fb498 <+5176>: shl $0x3,%rdi
	0x00000000007fb49c <+5180>: mov -0x6c8(%rbp,%rdi,1),%esi
	0x00000000007fb4b4 <+5204>: test %rax,%rax
	0x00000000007fb4b7 <+5207>: je 0x7fb900 <srv_master_thread+6304>
	0x00000000007fb4c1 <+5217>: cmp %esi,(%rax)
	0x00000000007fb4c3 <+5219>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4c5 <+5221>: mov 0xc(%r8),%edi
	0x00000000007fb4c9 <+5225>: cmp 0x4(%rax),%edi
	0x00000000007fb4cc <+5228>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4ce <+5230>: mov 0x60(%rax),%rdi
	0x00000000007fb4d2 <+5234>: cmp %rdi,0x10(%r11)
	0x00000000007fb4d6 <+5238>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4d8 <+5240>: nopl 0x0(%rax,%rax,1)

如果你汇编能力非常强，但是可以慢慢读起。但是，这往往非常累，因为这个函数太长了，并且由于编译优化，汇编代码不是和逻辑代码行级别的顺序完全对应。

对于我们这样的懒人，一般不太愿意，触发是实在没有办法。

那么，还有没有其它办法？有，答案是有的，用 disass /m 可以将汇编和代码对应起来！

	gdb -p 31639 -ex "disassemble /m srv_master_thread" --ex "quit" --batch > /tmp/g3.log

	3447 in /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18/storage/innobase/srv/srv0srv.c
	0x00000000007fb478 <+5144>: mov 0x3a8(%r10),%r12

	3448 in /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18/storage/innobase/srv/srv0srv.c
	3449 in /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18/storage/innobase/srv/srv0srv.c
	3450 in /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18/storage/innobase/srv/srv0srv.c
	3451 in /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18/storage/innobase/srv/srv0srv.c
	0x00000000007fb46d <+5133>: mov %r12,-0x740(%rbp)
	0x00000000007fb474 <+5140>: nopl 0x0(%rax)
	0x00000000007fb486 <+5158>: test %r12,%r12
	0x00000000007fb489 <+5161>: je 0x7fb908 <srv_master_thread+6312>
	0x00000000007fb48f <+5167>: lea (%r9,%r9,2),%rdi
	0x00000000007fb493 <+5171>: mov %r12,%rax
	0x00000000007fb496 <+5174>: xor %edx,%edx
	0x00000000007fb498 <+5176>: shl $0x3,%rdi
	0x00000000007fb49c <+5180>: mov -0x6c8(%rbp,%rdi,1),%esi
	0x00000000007fb4b4 <+5204>: test %rax,%rax
	0x00000000007fb4b7 <+5207>: je 0x7fb900 <srv_master_thread+6304>

	3452 in /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18/storage/innobase/srv/srv0srv.c
	0x00000000007fb4c1 <+5217>: cmp %esi,(%rax)
	0x00000000007fb4c3 <+5219>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4c5 <+5221>: mov 0xc(%r8),%edi
	0x00000000007fb4c9 <+5225>: cmp 0x4(%rax),%edi
	0x00000000007fb4cc <+5228>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4ce <+5230>: mov 0x60(%rax),%rdi
	0x00000000007fb4d2 <+5234>: cmp %rdi,0x10(%r11)
	0x00000000007fb4d6 <+5238>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4d8 <+5240>: nopl 0x0(%rax,%rax,1)

是不是看起来有点感觉了？终于有对应的代码了！

但是，高兴太早了，只是显示了代码文件名，没有说明是那行代码！

这个问题的原因是mysqld是在显示的那个目录下编译的，如何rpm打包，分发到线上机器部署。而安装的时候，我们是不安装对应的编译的代码文件。

那么，接下来怎么办？

好办，将对应的源文件拷贝一份到任何一个目录下，利用GDB的substitute-path来将编译时的路径和我们拷贝的代码路径对应起来就行了。

拷贝一份对应版本的源码到/tmp下，再次disass下：

注：0x00000000007fb46d 这个地址是我随便选择的，在srv_master_thread函数中某个有些地址，在0x7fb4c1之前，没有太多实际意义。

	gdb -p 31639 -ex "set substitute-path  /home/jiyuan/rpmbuild/BUILD/tb-mysql-5.5.18 /tmp/alimysql-5.5.18" -ex "disassemble /m  0x00000000007fb46d  " --ex "quit" --batch > /tmp/g4.log

	3446 for (j = 0; j < srv_buf_pool_instances; j++) {
	0x00000000007fb47f <+5151>: mov 0x3a0(%r10),%r13

	3447 lint blocks_num, new_blocks_num, flushed_blocks_num;
	0x00000000007fb478 <+5144>: mov 0x3a8(%r10),%r12

	3448 ibool found;
	3449
	3450 buf_pool = buf_pool_from_array(j);
	3451
	0x00000000007fb46d <+5133>: mov %r12,-0x740(%rbp)
	0x00000000007fb474 <+5140>: nopl 0x0(%rax)
	0x00000000007fb486 <+5158>: test %r12,%r12
	0x00000000007fb489 <+5161>: je 0x7fb908 <srv_master_thread+6312>
	0x00000000007fb48f <+5167>: lea (%r9,%r9,2),%rdi
	0x00000000007fb493 <+5171>: mov %r12,%rax
	0x00000000007fb496 <+5174>: xor %edx,%edx
	0x00000000007fb498 <+5176>: shl $0x3,%rdi
	0x00000000007fb49c <+5180>: mov -0x6c8(%rbp,%rdi,1),%esi
	0x00000000007fb4b4 <+5204>: test %rax,%rax
	0x00000000007fb4b7 <+5207>: je 0x7fb900 <srv_master_thread+6304>

	3452 blocks_num = UT_LIST_GET_LEN(buf_pool->flush_list);
	0x00000000007fb4c1 <+5217>: cmp %esi,(%rax)
	0x00000000007fb4c3 <+5219>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4c5 <+5221>: mov 0xc(%r8),%edi
	0x00000000007fb4c9 <+5225>: cmp 0x4(%rax),%edi
	0x00000000007fb4cc <+5228>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4ce <+5230>: mov 0x60(%rax),%rdi
	0x00000000007fb4d2 <+5234>: cmp %rdi,0x10(%r11)
	0x00000000007fb4d6 <+5238>: jne 0x7fb4b0 <srv_master_thread+5200>
	0x00000000007fb4d8 <+5240>: nopl 0x0(%rax,%rax,1)

	3453 bpage = UT_LIST_GET_FIRST(buf_pool->flush_list);
	3454 new_blocks_num = 0;
	0x00000000007fb4a3 <+5187>: lea -0x6d0(%rbp,%rdi,1),%r8
	0x00000000007fb4ab <+5195>: jmp 0x7fb4c1 <srv_master_thread+5217>
	0x00000000007fb4ad <+5197>: nopl (%rax)

	3455
	3456 found = FALSE;
	3457 while (bpage != NULL) {
	3458 if (prev_flush_info[j].space == bpage->space
	3459 && prev_flush_info[j].offset == bpage->offset
	0x00000000007fb4b0 <+5200>: mov 0x40(%rax),%rax

	3460 && prev_flush_info[j].oldest_modification
	0x00000000007fb4bd <+5213>: add $0x1,%rdx

终于看到熟悉的代码了！

可以定位到问题本质，第3452行异常导致，即buf_pool->flush_list.count访问为非法内存地址。

这段代码是srv_master_thread频繁访问的内存变量，出现这种问题，我只能说是其它地方有异常导致此处内存被污染。至于原因，没有啥思路，等下会遇到再分析。

到此，我们就能力范围内对mysql的backtrace进行了深度挖掘，揭开backtrace中地址的神秘面纱。但这个问题还是没有解决，backtrace中还有其它可以挖掘的信息，后面有高人指定也许会豁然开朗。
