---
layout: post
category : Linux
tags : [CentOS, Linux]
title: 使用ptrace
---
{% include JB/setup %}
**[Linux上程序调试的基石(1)--ptrace](http://javadino.blog.sohu.com/101228695.html)**

**引子: **

	1.在Linux系统中，进程状态除了我们所熟知的TASK_RUNNING，TASK_INTERRUPTIBLE，TASK_STOPPED等，还有一个TASK_TRACED。这表明这个进程处于什么状态？ 
	2.strace可以方便的帮助我们记录进程所执行的系统调用，它是如何跟踪到进程执行的？ 
	3.gdb是我们调试程序的利器，可以设置断点，单步跟踪程序。它的实现原理又是什么？ 

所有这一切的背后都隐藏着Linux所提供的一个强大的系统调用ptrace(). 

**1.ptrace系统调用**

ptrace系统调从名字上看是用于进程跟踪的，它提供了父进程可以观察和控制其子进程执行的能力，并允许父进程检查和替换子进程的内核镜像(包 括寄存器)的值。其基本原理是: 当使用了ptrace跟踪后，所有发送给被跟踪的子进程的信号(除了SIGKILL)，都会被转发给父进程，而子进程则会被阻塞，这时子进程的状态就会被 系统标注为TASK_TRACED。而父进程收到信号后，就可以对停止下来的子进程进行检查和修改，然后让子进程继续运行。 

其原型为：	

	#include <sys/ptrace.h> 
	long ptrace(enum __ptrace_request request, pid_t pid, void *addr, void *data); 

ptrace有四个参数: 

	1). enum __ptrace_request request：指示了ptrace要执行的命令。 
	2). pid_t pid: 指示ptrace要跟踪的进程。 
	3). void *addr: 指示要监控的内存地址。 
	4). void *data: 存放读取出的或者要写入的数据。 

ptrace是如此的强大，以至于有很多大家所常用的工具都基于ptrace来实现，如strace和gdb。接下来，我们借由对strace和gdb的实现，来看看ptrace是如何使用的。 

**2. strace的实现 **

strace常常被用来拦截和记录进程所执行的系统调用，以及进程所收到的信号。如有这么一段程序： 

	HelloWorld.c: 
	#include <stdio.h> 
	int main(){ 
	    printf("Hello World!\n"); 
	    return 0; 
	} 

编译后，用strace跟踪： strace ./HelloWorld 

可以看到形如: 

	execve("./HelloWorld", ["./HelloWorld"], [/* 67 vars */]) = 0 
	brk(0)                                  = 0x804a000 
	mmap2(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0xb7f18000 
	access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No such file or directory) 
	open("/home/supperman/WorkSpace/lib/tls/i686/sse2/libc.so.6", O_RDONLY) = -1 ENOENT (No such file or directory) 
	... 

的一段输出，这就是在执行HelloWorld中，系统所执行的系统调用，以及他们的返回值。 

下面我们用ptrace来研究一下它是怎么实现的。 

	... 
	    switch(pid = fork()) 
	    { 
	    case -1: 
	        return -1; 
	    case 0: //子进程 
	        ptrace(PTRACE_TRACEME,0,NULL,NULL); 
	        execl("./HelloWorld", "HelloWorld", NULL); 
	    default: //父进程 
	        wait(&val); //等待并记录execve 
	        if(WIFEXITED(val)) 
	            return 0; 
	        syscallID=ptrace(PTRACE_PEEKUSER, pid, ORIG_EAX*4, NULL); 
	        printf("Process executed system call ID = %ld\n",syscallID); 
	        ptrace(PTRACE_SYSCALL,pid,NULL,NULL); 
	        while(1) 
	        { 
	            wait(&val); //等待信号 
	            if(WIFEXITED(val)) //判断子进程是否退出 
	                return 0; 
	            if(flag==0) //第一次(进入系统调用)，获取系统调用的参数 
	            { 
	                syscallID=ptrace(PTRACE_PEEKUSER, pid, ORIG_EAX*4, NULL); 
	                printf("Process executed system call ID = %ld ",syscallID); 
	                flag=1; 
	            } 
	            else //第二次(退出系统调用)，获取系统调用的返回值 
	            { 
	                returnValue=ptrace(PTRACE_PEEKUSER, pid, EAX*4, NULL); 
	                printf("with return value= %ld\n", returnValue); 
	                flag=0; 
	            } 
	            ptrace(PTRACE_SYSCALL,pid,NULL,NULL); 
	        } 
	    } 
	... 

在上面的程序中，fork出的子进程先调用了ptrace(PTRACE_TRACEME)表示子进程让父进程跟踪自己。然后子进程调用 execl加载执行了HelloWorld。而在父进程中则使用wait系统调用等待子进程的状态改变。子进程因为设置了PTRACE_TRACEME而 在执行系统调用被系统停止(设置为TASK_TRACED)，这时父进程被唤醒，使用ptrace(PTRACE_PEEKUSER,pid,...)分 别去读取子进程执行的系统调用ID(放在ORIG_EAX中)以及系统调用返回时的值(放在EAX中)。然后使用ptrace (PTRACE_SYSCALL,pid,...)指示子进程运行到下一次执行系统调用的时候(进入或者退出)，直到子进程退出为止。 

程序的执行结果如下: 

	Process executed system call ID = 11 
	Process executed system call ID = 45 with return value= 134520832 
	Process executed system call ID = 192 with return value= -1208934400 
	Process executed system call ID = 33 with return value= -2 
	Process executed system call ID = 5 with return value= -2 
	... 

其中，11号系统调用就是execve，45号是brk,192是mmap2,33是access,5是open...经过比对可以发现，和 strace的输出结果一样。当然strace进行了更详尽和完善的处理，我们这里只是揭示其原理，感兴趣的同学可以去研究一下strace的实现。 

PS: 

	1). 在系统调用执行的时候，会执行pushl %eax # 保存系统调用号ORIG_EAX在程序用户栈中。 
	2). 在系统调用返回的时候，会执行movl %eax,EAX(%esp)将系统调用的返回值放入寄存器%eax中。 
	3). WIFEXITED()宏用来判断子进程是否为正常退出的，如果是，它会返回一个非零值。 
	4). 被跟踪的程序在进入或者退出某次系统调用的时候都会触发一个SIGTRAP信号，而被父进程捕获。 
	5). execve()系统调用执行成功的时候并没有返回值，因为它开始执行一段新的程序，并没有"返回"的概念。失败的时候会返回-1。 
	6). 在父进程进行进行操作的时候，用ps查看，可以看到子进程的状态为T,表示子进程处于TASK_TRACED状态。当然为了更具操作性，你可以在父进程中加入sleep()。

**3. GDB的实现**

GDB是GNU发布的一个强大的程序调试工具，用以调试C/C++程序。可以使程序员在程序运行的时候观察程序在内存/寄存器中的使用情况。它的实现也是基于ptrace系统调用来完成的。

其原理是利用ptrace系统调用，在被调试程序和gdb之间建立跟踪关系。然后所有发送给被调试程序的信号(除SIGKILL)都会被gdb截获，gdb根据截获的信号，查看被调试程序相应的内存地址，并控制被调试的程序继续运行。GDB常用的使用方法有断点设置和单步跟踪，接下来我们来分析一下他们是如何实现的。

**3.1 建立调试关系**

用gdb调试程序，可以直接gdb ./test,也可以gdb pid(test的进程号)。这对应着使用ptrace建立跟踪关系的两种方式:

	1)fork: 利用fork+execve执行被测试的程序，子进程在执行execve之前调用ptrace(PTRACE_TRACEME)，建立了与父进程(debugger)的跟踪关系。如我们在分析strace时所示意的程序。
	2)attach: debugger可以调用ptrace(PTRACE_ATTACH，pid,...)，建立自己与进程号为pid的进程间的跟踪关系。即利用PTRACE_ATTACH，使自己变成被调试程序的父进程(用ps可以看到)。用attach建立起来的跟踪关系，可以调用ptrace(PTRACE_DETACH，pid,...)来解除。注意attach进程时的权限问题，如一个非root权限的进程是不能attach到一个root进程上的。

**3.2 断点原理**

断点是大家在调试程序时常用的一个功能,如break linenumber，当执行到linenumber那一行的时候被调试程序会停止，等待debugger的进一步操作。 

断点的实现原理，就是在指定的位置插入断点指令，当被调试的程序运行到断点的时候，产生SIGTRAP信号。该信号被gdb捕获并进行断点命中判定，当gdb判断出这次SIGTRAP是断点命中之后就会转入等待用户输入进行下一步处理，否则继续。

断点的设置原理: 在程序中设置断点，就是先将该位置的原来的指令保存，然后向该位置写入int 3。当执行到int 3的时候，发生软中断，内核会给子进程发出SIGTRAP信号，当然这个信号会被转发给父进程。然后用保存的指令替换int3,等待恢复运行。

断点命中判定:gdb把所有的断点位置都存放在一个链表中，命中判定即把被调试程序当前停止的位置和链表中的断点位置进行比较，看是断点产生的信号，还是无关信号。

**3.3 单步跟踪原理**

单步跟踪就是指在调试程序的时候，让程序运行一条指令/语句后就停下。GDB中常用的命令有next, step, nexti, stepi。单步跟踪又常分为语句单步(next, step)和指令单步(如nexti, stepi)。

在linux上，指令单步可以通过ptrace来实现。调用ptrace(PTRACE_SINGLESTEP,pid,...)可以使被调试的进程在每执行完一条指令后就触发一个SIGTRAP信号，让GDB运行。下面来看一个例子:

	    child = fork();
	    if(child == 0) {
	         execl("./HelloWorld", "HelloWorld", NULL);
	    }
	    else {
	        ptrace(PTRACE_ATTACH,child,NULL,NULL);
	        while(1){
	        wait(&val);
	        if(WIFEXITED(val))
	            break;
	        count++;
	        ptrace(PTRACE_SINGLESTEP,child,NULL,NULL);
	        }
	    printf("Total Instruction number= %d/n",count);
	    }

这段程序比较简单，子进程调用execve执行HelloWorld,而父进程则先调用ptrace(PTRACE_ATTACH,pid,...)建立与子进程的跟踪关系。然后调用ptrace(PTRACE_SINGLESTEP, pid, ...)让子进程一步一停，以统计子进程一共执行了多少条指令(你会发现一个简单的HelloWorld实际上也执行了好几万条指令才完成)。当然你也完全可以在这个时候查看EIP寄存器中存放的指令，或者某个变量的值，当然前提是你得知道这个变量在子进程内存镜像中的位置。

指令单步可以依靠硬件完成，如x86架构处理器支持单步模式(通过设置EFLAGS寄存器的TF标志实现)，每执行一条指令，就会产生一次异常(在Intel 80386以上的处理器上还提供了DRx调试寄存器以用于软件调试)。也可以通过软件完成，即在每条指令后面都插入一条断点指令，这样每执行一条指令都会产生一次软中断。

语句单步基于指令单步实现，即GDB算好每条语句所对应的指令，从什么地方开始到什么地方结束。然后在结束的地方插入断点，或者指令单步一步一步的走到结束点，再进行处理。

当然gdb的实现远比今天我们所说的内容要复杂，它能让我们很容易的监测，修改被调试的进程，比如通过行号，函数名，变量名。而要真正实现这些，一是需要在编译的时候提供足够的信息，如在gcc时加入-g选项，这样gcc会把一些程序信息放到生成的ELF文件中，包括函数符号表，行号，变量信息，宏定义等，以便日后gdb调试，当然生成的文件也会大一些。二是需要我们对ELF文件格式，进程的内存镜像(布局)以及程序的指令码十分熟悉。这样才能保证在正确的时机(断点发生？单步？)找到正确的内存地址(代码？数据？)并链接回正确的程序代码(这是哪个变量？程序第几行？)。感兴趣的同学可以找到相应的代码仔细分析一下。

**小结:**

ptrace可以实时监测和修改另一个进程的运行，它是如此的强大以至于曾经因为它在unix-like平台(如Linux, *BSD)上产生了各种漏洞。但换言之，只要我们能掌握它的使用，就能开发出很多以前在用户态下不可能实现的应用。当然这可能需要我们掌握编译，文件格式，程序内存布局等相当多的底层知识。

最后让我们来回顾一下ptrace的使用:

	1)用PTRACE_ATTACH或者PTRACE_TRACEME 建立进程间的跟踪关系。
	2)PTRACE_PEEKTEXT, PTRACE_PEEKDATA, PTRACE_PEEKUSR等读取子进程内存/寄存器中保留的值。
	3)PTRACE_POKETEXT, PTRACE_POKEDATA, PTRACE_POKEUSR等把值写入到被跟踪进程的内存/寄存器中。
	4)用PTRACE_CONT，PTRACE_SYSCALL, PTRACE_SINGLESTEP控制被跟踪进程以何种方式继续运行。
	5)PTRACE_DETACH, PTRACE_KILL 脱离进程间的跟踪关系。

**TIPS:**

    1). 进程状态TASK_TRACED用以表示当前进程因为被父进程跟踪而被系统停止。
    2). 如在子进程结束前，父进程结束，则trace关系解除。
    3). 利用attach建立起来的跟踪关系，虽然ps看到双方为父子关系，但在"子进程"中调用getppid()仍会返回原来的父进程id。
    4). 不能attach到自己不能跟踪的进程，如non-root进程跟踪root进程。
    5). 已经被trace的进程，不能再次被attach。
    6). 即使是用PTRACE_TRACEME建立起来的跟踪关系，也可以用DETACH的方式予以解除。
    7). 因为进入/退出系统调用都会触发一次SIGTRAP，所以通常的做法是在第一次(进入)的时候读取系统调用的参数，在第二次(退出)的时候读取系统调用的返回值。但注意execve是个例外。
    8). 程序调试时的断点由int 3设置完成，而单步跟踪则可由ptrace(PTRACE_SINGLESTEP)实现。




**[使用ptrace跟踪进程](http://godorz.info/2011/02/process-tracing-using-ptrace/)**

系统调用ptrace对gdb这种调试器来说是非常重要的,杯具的是,相关的文档却残缺不详–除非你觉得最好的文档就是内核源码!!下面,我会试着向大家展示ptrace在gdb这类工具中的作用.

**1. 介绍**

ptrace()是一个系统调用,它允许一个进程控制另外一个进程的执行.不仅如此,我们还可以借助于ptrace修改某个进程的空间(内存或寄存器),任何传递给一个进程(即被跟踪进程)的信号(除了会直接杀死进程的SIGKILL信号)都会使得这个进程进入暂停状态,这时系统通过wait()通知跟踪进程,这样,跟踪进程就可以修改被跟踪进程的行为了.

如果跟踪进程在被跟踪进程的内存中设置了相关的事件标志位,那么运行中被跟踪进程也可能因为特殊的事件而暂停.跟踪结束后,跟踪进程甚至可以通过设置被跟踪进程的退出码(exit code)来杀死它,当然也可以让它继续运行.

注意: ptrace()是高度依赖于底层硬件的.使用ptrace的程序通常不容易在个钟体系结构间移植.

**2. 细节**

ptrace的原型如下:

	view sourceprint?
	#include <sys/ptrace.h>
	long int ptrace(enum __ptrace_request request, pid_t pid, void * addr, void * data)

我们可以看到,ptrace有4个参数,其中,request决定ptrace做什么,pid是被跟踪进程的ID,data存储从进程空间偏移量为addr的地方开始将被读取/写入的数据.

父进程可以通过将request设置为PTRACE_TRACEME,以此跟踪被fork出来的子进程,它同样可以通过使用PTRACE_ATTACH来跟踪一个已经在运行的进程.

**2.1 ptrace如何工作**

不管ptrace是什么时候被调用的,它首先做的就是锁住内核.在ptrace返回前,内核会被解锁.在这个过程中,ptrace是如何工作的呢,我们看看request值(译注: request的可选值值是定义在/usr/include/sys/ptrace.h中的宏)代表的含义吧.

PTRACE_TRACEME:

PTRACE_TRACEME是被父进程用来跟踪子进程的.正如前面所说的,任何信号(除了SIGKILL),不管是从外来的还是由exec系统调用产生的,都将使得子进程被暂停,由父进程决定子进程的行为.在request为PTRACE_TRACEME情况下,ptrace()只干一件事,它检查当前进程的ptrace标志是否已经被设置,没有的话就设置ptrace标志,除了request的任何参数(pid,addr,data)都将被忽略.

PTRACE_ATTACH:

request为PTRACE_ATTACH也就意味着,一个进程想要控制另外一个进程.需要注意的是,任何进程都不能跟踪控制起始进程init,一个进程也不能跟踪自己.某种意义上,调用ptrace的进程就成为了ID为pid的进程的’父’进程.但是,被跟踪进程的真正父进程是ID为getpid()的进程.

PTRACE_DETACH:

用来停止跟踪一个进程.跟踪进程决定被跟踪进程的生死.PTRACE_DETACH会恢复PTRACE_ATTACH和PTRACE_TRACEME的所有改变.父进程通过data参数设置子进程的退出状态(exit code).子进程的ptrace标志就被复位,然后子进程被移到它原来所在的任务队列中.这时候,子进程的父进程的ID被重新写回子进程的父进程标志位.可能被修改了的single-step标志位也会被复位.最后,子进程被唤醒,貌似神马都没有发生过;参数addr会被忽略.

PTRACE_PEEKTEXT, PTRACE_PEEKDATA, PTRACE_PEEKUSER:

这些宏用来读取子进程的内存和用户态空间(user space).PTRACE_PEEKTEXT和PTRACE_PEEKDATA从子进程内存读取数据,两者功能是相同的.PTRACE_PEEKUSER从子进程的user space读取数据.它们读一个字节的数据,保存在临时的数据结构中,然后使用put_user()(它从内核态空间读一个字符串到用户态空间)将需要的数据写入参数data,返回0表示成功.

对PTRACE_PEEKTEXT和PTRACE_PEEKDATA而言,参数addr是子进程内存中将被读取的数据的地址.对PTRACE_PEEKUSER来说,参数addr是子进程用户态空间的偏移量,此时data被无视.

PTRACE_POKETEXT, PTRACE_POKEDATA, PTRACE_POKEUSER:

这些宏行为与上面的几个是类似的.唯一的不同是它们用来写入data.(译注: 这段文字与上面的描述差不多,为免繁复,不译.)

PTRACE_SYSCALL, PTRACE_CONT:

这些宏用来唤醒暂停的子进程.在每次系统调用之后,PTRACE_SYSCALL使子进程暂停,而PTRACE_CONT让子进程继续运行.子进程的返回状态都是由ptrace()参数data设置的.但是,这只限于返回状态是有效的情况.ptrace()重置子进程的single-step位,设置/复位syscall-trace位,然后唤醒子进程;参数addr被无视.

PTRACE_SINGLESTEP:

PTRACE_SINGLESTEP的行为与PTRACE_SYSCALL无异,除了子进程在每次机器指令后都被暂停(PTRACE_SYSCALL是使子进程每次在系统调用后被暂停).single-step会被设置,跟PTRACE_SYSCALL一样,参数data包含返回状态,参数addr被无视.

PTRACE_KILL:

PTRACE_KILL被用来终止子进程.”谋杀”是这样进行的: 首先ptrace() 查看子进程是不是已经死了.如果不是, 子进程的返回码被设置为sigkill. single-step位被复位.然后子进程被唤醒,运行到返回码时子进程就死掉了.

**2.2 更加依赖于硬件的调用.**

上面讨论的request可选值是依赖于操作系统所在的体系结构和实现的.下面讨论的request可选值可以用来get/set子进程的寄存器,这更加依赖于系统架构.对寄存器的设置包括通用寄存器,浮点寄存器和扩展的浮点寄存器.

PTRACE_GETREGS, PTRACE_GETFPREGS, PTRACE_GETFPXREGS:

这些宏用来读子进程的寄存器.寄存器的值通过getreg()和__put_user()被读入data中;参数addr被无视.

PTRACE_SETREGS, PTRACE_SETFPREGS, PTRACE_SETFPXREGS:

跟上面的描述相反,这些宏被用来设置寄存器.

**2.3 ptrace()的返回值**

成功的ptrace()调用返回0.如果出错,将返回-1，errno也将被设置.PEEKDATA/PEEKTEXT,即使ptrace()调用成功,返回值也可能是-1,所以我们最好检查一下errno,它的可能值如下:

EPERM: 权限错误,进程无法被跟踪.

ESRCH: 目标进程不存在或者已经被跟踪.

EIO: 参数request的值无效,或者从非法的内存读/写数据.

EFAULT: 需要读/写数据的内存未被映射.

EIO和EFAULT真的很难区分,它们代表很严重的错误.

**3. 小例子**

如果你觉得上面的说明太枯燥了,好吧,我保证再也不这么干了.下面举个小例子,演示一下吧.

这是第一个,父进程对子进程中发生的每一次机器指令计数.

	#include <stdio.h>
	#include <stdlib.h>
	#include <signal.h>
	#include <syscall.h>
	#include <sys/ptrace.h>
	#include <sys/types.h>
	#include <sys/wait.h>
	#include <unistd.h>
	#include <errno.h>

	int main(void)
	{
	        long long counter = 0;  /*  machine instruction counter */
	        int wait_val;           /*  child's return value        */
	        int pid;                /*  child's process id          */

	        puts("Please wait");

	        switch (pid = fork()) {
	        case -1:
	                perror("fork");
	                break;
	        case 0: /*  child process starts        */
	                ptrace(PTRACE_TRACEME, 0, 0, 0);
	                /* 
	                 *  must be called in order to allow the
	                 *  control over the child process
	                 */ 
	                execl("/bin/ls", "ls", NULL);
	                /*
	                 *  executes the program and causes
	                 *  the child to stop and send a signal 
	                 *  to the parent, the parent can now
	                 *  switch to PTRACE_SINGLESTEP   
	                 */ 
	                break;
	                /*  child process ends  */
	        default:/*  parent process starts       */
	                wait(&wait_val); 
	                /*   
	                 *   parent waits for child to stop at next 
	                 *   instruction (execl()) 
	                 */
	                while (wait_val == 1407 ) {
	                        counter++;
	                        if (ptrace(PTRACE_SINGLESTEP, pid, 0, 0) != 0)
	                                perror("ptrace");
	                        /* 
	                         *   switch to singlestep tracing and 
	                         *   release child
	                         *   if unable call error.
	                         */
	                        wait(&wait_val);
	                        /*   wait for next instruction to complete  */
	                }
	                /*
	                 * continue to stop, wait and release until
	                 * the child is finished; wait_val != 1407
	                 * Low=0177L and High=05 (SIGTRAP)
	                 */
	        }
	        printf("Number of machine instructions : %lld\n", counter);
	        return 0;
	}

运行一下代码吧(可能程序会很慢,哈哈.).

译注: 小小的解释下吧,子进程开始运行,调用exec后移花栽木,这时子进程的原进程(未调用exec之前的进程)因为要死了,会向父进程发送SIGTRAP信号.父进程一直阻塞等待(第一条wait(&wait_val);语句).父进程捕获到SIGTRAP信号,由此知道子进程已经结束了.接下来发生的就是最有趣的事情了,父进程通过request值为PTRACE_SINGLESTEP的ptrace调用,告诉操作系统,重新唤醒子进程,但是在每条机器指令运行之后暂停.再一次的,父进程阻塞等待子进程暂停(wait_val == 1407等价于WIFSTOPPED(wait_val) (个人看法,我还没有查到子进程状态的编码资料,求~))并计数,子进程结束(非暂停,对应的是WIFEXITED)后,父进程跳出loop循环.

**4. 结论**

ptrace()在调试器中是被用得很多的,它也可以被用来跟踪系统调用.调试器fork一个子进程并跟踪它,然后子进程exec调用要被调试的目标程序,在目标程序的每一次机器指令之后父进程都可以查看它的寄存器的值.