---
layout: post
category : Ruby
tags : [Ruby]
title: 认识六个被误解的 Ruby 特性
---
{% include JB/setup %}
**来自：[http://www.ibm.com/developerworks/cn/opensource/os-sixrubyfeatures/index.html](http://www.ibm.com/developerworks/cn/opensource/os-sixrubyfeatures/index.html)**

如果您是一名 C++ 程序员且需要在 Ruby 环境中工作，那么您有一些功课要做。本文讨论了 Ruby 新手可能会误解的六个 Ruby 特性，特别是当他或她来自一个类似但又不太相同的环境，比如 C++：

    Ruby 类层次结构
    Ruby 中的单例方法
    self 关键词
    method_missing 方法
    异常处理
    线程

**注意：**本文中所有的代码均进行测试，且基于 Ruby 版本 1.8.7。

**Ruby 中的类层次结构**

Ruby 中的类层次结构会很棘手。创建一个 Cat 类型的类并开始探讨其层次结构（参见 清单 1）。

清单 1. Ruby 中的隐式类层次结构

    irb(main):092:0> class Cat
    irb(main):093:1> end
    => nil

    irb(main):087:0> c = Cat.new
    => #<Cat:0x2bacb68>
    irb(main):088:0> c.class
    => Cat
    irb(main):089:0> c.class.superclass
    => Object
    irb(main):090:0> c.class.superclass.superclass
    => nil
    irb(main):091:0> c.class.superclass.superclass.superclass
    NoMethodError: undefined method `superclass' for nil:NilClass
            from (irb):91
            from :0

Ruby 中的所有对象（甚至用户定义的对象）都是 Object 类的后代，这在清单 1 中清晰可见。这与 C++ 是鲜明的对比。这一点也不像普通数据类型，例如 C/C++ int 或 double。清单 2 显示了整数 1 的类层次结构。

清单 2. 整数 1 的类层次结构

    irb(main):100:0> 1.class
    => Fixnum
    irb(main):101:0> 1.class.superclass
    => Integer
    irb(main):102:0> 1.class.superclass.superclass
    => Numeric
    irb(main):103:0> 1.class.superclass.superclass.superclass
    => Object

到目前为止一切顺利。现在您知道了类本身是 Class 类型的对象。而 Class 最终派生自 Object，如 清单 3 中所示使用 Ruby 内置的 String 类。

清单 3. 类的类层次结构

    irb(main):100:0> String.class
    => Class
    irb(main):101:0> String.class.superclass
    => Module
    irb(main):102:0> String.class.superclass.superclass
    => Object

Module 是 Class 的基类，但是使用它时有一点要注意，即您不能直接实例化用户定义的 Module 对象。如果您不想深入 Ruby 内部，最好考虑与 C++ 命名空间有类似特征的 Module：您可以定义您自己的方法、常量、等等。您在 Class 中包含了一个 Module，以及 voilà，Module 的所有元素现在会魔法般地成为 Class 的元素。清单 4 提供了一个示例。

清单 4. Module 不能进行直接实例化，并且只能与类一同使用

    irb(main):020:0> module MyModule
    irb(main):021:1> def hello
    irb(main):022:2> puts "Hello World"
    irb(main):023:2> end
    irb(main):024:1> end
    irb(main):025:0> test = MyModule.new
    NoMethodError: undefined method `new' for MyModule:Module
            from (irb):25
    irb(main):026:0> class MyClass
    irb(main):027:1> include MyModule
    irb(main):028:1> end
    => MyClass
    irb(main):029:0> test = MyClass.new
    => #<MyClass:0x2c18bc8>
    irb(main):030:0> test.hello
    Hello World 
    => nil

下面再重申一下重点：当您使用 Ruby 编写 c = Cat.new 时，c 是派生自 Object 的 Cat 类型的一个对象。Cat 类是 Class 类型的一个对象，Class 派生自 Module，而 Module 又派生自 Object。因此该对象及其类型都是有效的 Ruby 对象。

**单例方法和可编辑类**

现在，看一下单例方法。假设您想使用 C++ 建模类似于人类社会的东西。那么您会如何做呢？定义一个名为 Human 的类，然后定义数百万的 Human 对象？这更像是在建模一个呆板的社会；每个人必须具惟一的特征。Ruby 的单例方法在这里就派上了用场，如 清单 5 所示。

清单 5. Ruby 中的单例方法

    irb(main):113:0> y = Human.new
    => #<Human:0x319b6f0>
    irb(main):114:0> def y.paint
    irb(main):115:1> puts "Can paint"
    irb(main):116:1> end
    => nil
    irb(main):117:0> y.paint
    Can paint
    => nil
    irb(main):118:0> z = Human.new
    => #<Human:0x3153fc0>
    irb(main):119:0> z.paint
    NoMethodError: undefined method `paint' for #<Human:0x3153fc0>
            from (irb):119

Ruby 中的单例方法 是仅与特定对象关联的方法，不能用于一般的类。它们的前缀是对象名称。在 清单 5 中，paint 方法特定于 y 对象，而且仅限于 y 对象；z.paint 导致一个 “方法未定义” 错误。您可以调用 singleton_methods 来查明一个对象中的单例方法列表：

    irb(main):120:0> y.singleton_methods
    => ["paint"]

不过在 Ruby 中有另一种定义单例方法的方式。看看 清单 6 中的代码。

清单 6. 创建单例方法的另一种方式

    irb(main):113:0> y = Human.new
    => #<Human:0x319b6f0>
    irb(main):114:0> class << y
    irb(main):115:1> def sing
    irb(main):116:1> puts "Can sing"
    irb(main):117:1> end
    irb(main):118:1>end
    => nil
    irb(main):117:0> y.sing
    Can sing
    => nil

清单 5 还开创了新的可能性，可以添加新方法到用户定义的类和内置的 Ruby 现有类，比如 String。这在 C++ 中是不可能实现的，除非您能够访问您使用的类的源代码。再次观察 String 类（清单 7）。

清单 7. Ruby 允许您修改一个现有的类

    irb(main):035:0> y = String.new("racecar")
    => "racecar"
    irb(main):036:0> y.methods.grep(/palindrome/)
    => [ ]
    irb(main):037:0> class String
    irb(main):038:1> def palindrome?
    irb(main):039:2> self == self.reverse
    irb(main):040:2> end
    irb(main):041:1> end
    irb(main):050:0> y.palindrome?
    => true

清单 7 清楚地展示了如何编辑一个现有的 Ruby 类来添加您自行选择的方法。这里，我添加了 palindrome? 方法到 String 类。因此 Ruby 类在运行时是可编辑的（一个强大的属性）。

现在您对 Ruby 的类层次结构和单例有了一定的认识，接下来我们来看 self。注意，在定义 palindrome? 方法时我使用了 self。

**发现 self**

self 关键词的最常见用法可能就是在 Ruby 类中声明一个静态方法，如 清单 8 所示。

清单 8. 使用 self 声明类的静态方法

    class SelfTest
       def self.test
          puts "Hello World with self!"
       end
    end

    class SelfTest2
       def test
          puts "This is not a class static method"
       end
    end

    SelfTest.test
    SelfTest2.test

从 清单 8 的输出中可以看到（如 清单 9 所示），没有对象您无法调用非静态方法。该行为类似于 C++。

清单 9. 在没有对象的情况下调用非静态方法时会出错

    irb(main):087:0> SelfTest.test
    Hello World with self!
    => nil
    irb(main):088:0> SelfTest2.test
    NoMethodError: undefined method 'test' for SelfTest2:Class
            from (irb):88

在探讨 self 更深奥的用途和含义之前，注意您也可以通过在方法名称前面加上类名来在 Ruby 中定义一个静态方法：

    class TestMe
       def TestMe.test
           puts "Yet another static member function"
       end
    end

    TestMe.test  # works fine

清单 10 提供了 self 的一个更有趣但不太容易找到的用法。

清单 10. 使用元类来声明静态方法

    class MyTest
       class << self 
         def test
            puts "This is a class static method"
         end
       end
    end

    MyTest.test   # works fine 

该段代码以一种稍微不同的方式将 test 定义为一个类静态方法。要了解究竟发生了什么，您需要看一下 class << self 语法的一些细节。class << self … end 创建一个元类。在方法查找链中，在访问对象的基类之前先搜索该对象的元类。如果您在元类中定义一个方法，可以在类上调用该方法。这类似于 C++ 中静态方法的概念。
可以访问一个元类吗？是的：只需从 class << self … end 内返回 self。注意，在一个 Ruby 类声明中，您没有义务仅给出方法定义。清单 11 显示了元类。

清单 11. 理解元类

    irb(main):198:0> class MyTest
    irb(main):199:1> end
    => nil
    irb(main):200:0> y = MyTest.new
    => #< MyTest:0x2d43fe0>
    irb(main):201:0> z = class MyTest
    irb(main):202:1> class << self
    irb(main):203:2> self
    irb(main):204:2> end
    irb(main):205:1> end
    => #<Class: MyTest > 
    irb(main):206:0> z.class
    => Class
    irb(main):207:0> y.class
    => MyTest

回到 清单 7 的代码，您会看到 palindrome 被定义为 self == self.reverse。在该上下文中，self 与 C++ 没有什么区别。C++ 和 Ruby 中的方法都需要一个操作对象，以修改或提取状态信息。self 是指这里的这个对象。注意，可以通过附加 self 前缀来选择性地调用公共方法，指明方法付诸作用的对象，如 清单 12 所示。

清单 12. 使用 self 调用方法

    irb(main):094:0> class SelfTest3
    irb(main):095:1> def foo
    irb(main):096:2> self.bar()
    irb(main):097:2> end
    irb(main):098:1> def bar
    irb(main):099:2> puts "Testing Self"
    irb(main):100:2> end
    irb(main):101:1> end
    => nil
    irb(main):102:0> test = SelfTest3.new
    => #<SelfTest3:0x2d15750>
    irb(main):103:0> test.foo
    Testing Self 
    => nil

在 Ruby 中您无法通过附加 self 关键词前缀来调用私有方法。对于一名 C++ 开发人员，这可能会有点混淆。清单 13 中的代码明确表示，self 不能用于私有方法：对私有方法的调用只能针对隐式对象。

清单 13. self 不能用于私有方法调用

    irb(main):110:0> class SelfTest4
    irb(main):111:1> def method1
    irb(main):112:2> self.method2
    irb(main):113:2> end
    irb(main):114:1> def method3
    irb(main):115:2> method2
    irb(main):116:2> end
    irb(main):117:1> private
    irb(main):118:1> def method2
    irb(main):119:2> puts "Inside private method"
    irb(main):120:2> end
    irb(main):121:1> end
    => nil
    irb(main):122:0> y = SelfTest4.new
    => #<SelfTest4:0x2c13d80>
    irb(main):123:0> y.method1
    NoMethodError: private method `method2' called for #<SelfTest4:0x2c13d80>
            from (irb):112:in `method1'
    irb(main):124:0> y.method3
    Inside private method 
    => nil

由于 Ruby 中的一切都是对象，当在 irb 提示符上调用 self 时您会得到以下结果：

    irb(main):104:0> self
    => main
    irb(main):105:0> self.class
    => Object

一启动 irb，Ruby 解释器就为您创建主对象。这一主对象在 Ruby 相关的文章中也被称为顶层上下文。

关于 self 就介绍这么多了。下面我们接着来看动态方法和 method_missing 方法。

**method_missing 揭秘**

看一下 清单 14 中的 Ruby 代码。

清单 14. 运行中的 method_missing

    irb(main):135:0> class Test
    irb(main):136:1> def method_missing(method, *args)
    irb(main):137:2> puts "Method: #{method} Args: (#{args.join(', ')})"
    irb(main):138:2> end
    irb(main):139:1> end
    => nil
    irb(main):140:0> t = Test.new
    => #<Test:0x2c7b850>
    irb(main):141:0> t.f(23)
    Method: f Args: (23)
    => nil

显然，如果 voodoo 是您喜欢的，那么清单 14 会给您这个恩典。这里发生什么了呢？我们创建了一个 Test 类型的对象，然后调用了 t.f，以 23 作为参数。但是 Test 没有以 f 作为方法，您应当会得到一个 NoMethodError 或类似的错误消息。Ruby 在这里做了一件很棒的事情：您的方法调用被阻截并由 method_missing 处理。method_missing 的第一个参数是缺失的方法名，在本例中是 f。第二个（也是最后一个）参数是 *args，该参数捕获传递给 f 的参数。您可以在何处使用像这样的参数呢？在众多选项之中，您可以轻松地将方法调用转发到一个包含的 Module 或一个组件对象，而不为顶级类中的每个调用显式提供一个包装应用程序编程接口。

在 清单 15 中查看更多 voodoo。

清单 15. 使用 send 方法将参数传递给一个例程

    irb(main):142:0> class Test
    irb(main):143:1> def method1(s, y)
    irb(main):144:2> puts "S: #{s} Y: #{y}"
    irb(main):145:2> end
    irb(main):146:1> end
    => nil
    irb(main):147:0>t = Test.new
    irb(main):148:0> t.send(:method1, 23, 12)
    S: 23 Y: 12
    => nil

在 清单 15 中，class Test 有一个名为 method1 的方法被定义。但是，这里没有直接调用方法，而是发出对 send 方法的调用。send 是 Object 类的一个公共方法，因此可用于 Test（记住，所有类都派生自 Object）。send 方法的第一个参数是表示方法名称的一个符号和字符串。send 方法可以做到哪些您通常无法做到的事情？您可以使用 send 方法访问一个类的私有方法。当然，对于这是否是一个好特性仍然颇具争议。看一下 清单 16 中的代码。

清单 16. 访问类私有方法

    irb(main):258:0> class SendTest
    irb(main):259:1> private
    irb(main):260:1> def hello
    irb(main):261:2> puts "Saying Hello privately"
    irb(main):262:2> end
    irb(main):263:1> end
    => nil
    irb(main):264:0> y = SendTest.new
    => #< SendTest:0x2cc52c0>
    irb(main):265:0> y.hello
    NoMethodError: private method `hello' called for #< SendTest:0x2cc52c0>
            from (irb):265
    irb(main):266:0> y.send(:hello)
    Saying Hello privately
    => nil


**throw 和 catch 并非表面那样**

如果您像我一样具有 C++ 工作背景，且试图编写异常安全代码，那么在看到 Ruby 有 throw 和 catch 关键词时会开始感到异常亲切。遗憾的是，throw 和 catch 在 Ruby 中的含义完全不同。
Ruby 通常使用 begin…rescue 块处理异常。清单 17 提供了一个示例。

清单 17. Ruby 中的异常处理

    begin
      f = File.open("ruby.txt")
      # .. continue file processing 
    rescue ex => Exception
      # .. handle errors, if any 
    ensure
      f.close unless f.nil?
      # always execute the code in ensure block 
    end

在 清单 17 中，如果在试图打开文件时出错（可能是缺少文件或文件权限方面的问题），rescue 块中的代码会运行。ensure 块中的代码始终运行，不管是否有任何异常引发。注意，rescue 块后面是否紧跟 ensure 块是可选的。另外，如果必须显式地抛出一个异常，那么语法是 raise MyException。如果您选择拥有您自己的异常类，可能会希望从 Ruby 内置的 Exception 类派生出相同的类，以利用现有方法。

Ruby 中的 catch 和 throw 代码块实际上不是异常处理：您可以使用 throw 修改程序流程。清单 18 显示了一个使用 throw 和 catch 的示例。

清单 18. Ruby 中的 Throw 和 catch

    irb(main):185:0> catch :label do
    irb(main):186:1* puts "This will print"
    irb(main):187:1> throw :label
    irb(main):188:1> puts "This will not print"
    irb(main):189:1> end
    This will print
    => nil

在 清单 18 中，当代码运行到 throw 语句时，执行会被中断，解释器开始寻找处理相应符号的一个 catch 块。在 catch 块结束的地方继续执行。查看 清单 19 中的 throw 和 catch 示例：注意，您可以轻松将 catch 和 throw 语句用于各个函数。

清单 19. Ruby 中的异常处理：嵌套的 catch 块

    irb(main):190:0> catch :label do
    irb(main):191:1* catch :label1 do
    irb(main):192:2* puts "This will print"
    irb(main):193:2> throw :label
    irb(main):194:2> puts "This won't print"
    irb(main):195:2> end
    irb(main):196:1> puts "Neither will this print"
    irb(main):197:1> end
    This will print
    => nil

有些人甚至说，Ruby 中对 catch 和 throw 的支持将 C goto 行为带到一个全新的高度。鉴于函数可以有多个嵌套层，而 catch 块可能在每一级，goto 行为类比似乎有据可循。

**Ruby 中的线程可以是绿色的**

Ruby 版本 1.8.7 不支持真正的并发性。确实不支持。但是您会说，在 Ruby 中有 Thread 构造函数。您说的没错。不过这个 Thread.new 不会在您每次调用同一方法时生成一个真实的操作系统线程。Ruby 支持的是绿色线程：Ruby 解释器使用单一操作系统线程来处理来自多个应用程序级线程的工作负载。

当某个线程等待一些输入/输出发生时，这一 “绿色线程” 概念很有用，而且您可以轻松调度一个不同的 Ruby 线程来充分利用 CPU。但是这一构造函数无法使用现代的多核 CPU（维基百科提供了一段内容，很好地解释了什么是绿色线程。参见 参考资料 获取链接）。

最后这一个示例（参见 清单 20）证明了这一点。

清单 20. Ruby 中的多个线程

    #!/usr/bin/env ruby
     
    def func(id, count)
      i = 0;
      while (i < count)
        puts "Thread #{i} Time: #{Time.now}"
        sleep(1)
        i = i + 1
      end
    end
     
    puts "Started at #{Time.now}"
    thread1 = Thread.new{func(1, 100)}
    thread2 = Thread.new{func(2, 100)}
    thread3 = Thread.new{func(3, 100)}
    thread4 = Thread.new{func(4, 100)}

    thread1.join
    thread2.join
    thread3.join
    thread4.join
    puts "Ending at #{Time.now}"

假设您的 Linux® 或 UNIX® 机器上拥有 top 实用程序，在终端运行代码，获取进程 ID，然后再运行 top –p process id。top 启动后，按住 Shift-H 来列出运行中线程的数量。您应当只能看到一个线程，确认了这一点：Ruby 1.8.7 中的并发性不过是个神话。

总的看来，绿色线程没有什么坏处。它们在重负荷输入/输出密集型程序中仍然有用，更不用说该方法可能是操作系统间最可移植的一个了。

**结束语**

本文涵盖了以下多个方面：

    Ruby 中类层次结构的概念
    单例方法
    解释 self 关键词和 method_missing 方法
    异常
    线程

尽管 Ruby 不乏特立独行之处，但是使用它进行编程还是挺有趣的，而且其以最少的代码完成大量工作的能力还是很强大的。难怪 Twitter 这样的大型应用程序会使用 Ruby 来驾驭其真正的潜力。祝您有个快乐的 Ruby 编程体验！

**参考资料：**

阅读 [Programming Ruby: The Pragmatic Programmers' Guide](http://pragprog.com/book/ruby/programming-ruby)（Dave Thomas，Chad Fowler 和 Andy Hunt；第二版），这是一本 Ruby 必读书籍，也就是广为人知的 Pickaxe 图书。

查阅另一个宝贵的 Ruby 资源 [The Ruby Programming Language](http://www.amazon.com/Ruby-Programming-Language-David-Flanagan/dp/0596516177) [Yukihiro "Matz" Matsumoto（Ruby 的创建者）和 David Flanagan，O'Reilly，2008 年]。 

访问 [To Ruby From C and C++](http://www.ruby-lang.org/en/documentation/ruby-from-other-languages/to-ruby-from-c-and-c-)，这是一个面向希望学习 Ruby 的 C/C++ 程序员的一个不错站点。

在维基百科上了解更多有关 [绿色线程](http://en.wikipedia.org/wiki/Green_threads) 的解释信息。

[IBM Rational Twitter](http://twitter.com/#search?q=ibmrational)。

观看 [演示如何用 WebSphere Studio 快速开发Web Services](http://www.ibm.com/developerworks/cn/wsdd/library/demos/RapidWSdemo.html)，包括面向初学者的产品安装和设置演示，以及为经验丰富的开发人员提供的高级功能。

在 [developerWorks Linux 专区](http://www.ibm.com/developerworks/cn/linux/) 寻找为 Linux 开发人员（包括 [Linux 新手入门](http://www.ibm.com/developerworks/cn/linux/newto/)）准备的更多参考资料，查阅我们 [最受欢迎的文章和教程](http://www.ibm.com/developerworks/cn/linux/best2009/index.html)。 

在 developerWorks 上查阅所有 [Linux 技巧](http://www.ibm.com/developerworks/cn/views/linux/libraryview.jsp?search_by=Linux+%E6%8A%80%E5%B7%A7) 和 [Linux 教程](http://www.ibm.com/developerworks/cn/views/linux/libraryview.jsp?type_by=%E6%95%99%E7%A8%8B)。 

随时关注 developerWorks [技术活动](http://www.ibm.com/developerworks/cn/offers/techbriefings/)和[网络广播](http://www.ibm.com/developerworks/cn/swi/)。 

访问 developerWorks [Open source 专区](http://www.ibm.com/developerworks/cn/opensource/)获得丰富的 how-to 信息、工具和项目更新以及[最受欢迎的文章和教程](http://www.ibm.com/developerworks/cn/opensource/best2009/index.html)，帮助您用开放源码技术进行开发，并将它们与 IBM 产品结合使用。