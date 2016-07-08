---
layout: post
category : Linux
tags : [CentOS, Ubuntu, Shell]
title: 使用shell搜索文本
---
{% include JB/setup %}

**使用shell搜索文本 [http://www.cppblog.com/qinqing1984/archive/2011/08/20/153971.html](http://www.cppblog.com/qinqing1984/archive/2011/08/20/153971.html)**

**第1种**方法是使用find和xargs命令，示例如下

    find dir | xargs grep str        # dir是指某个目录
    find file | xargs grep str        # file是指某个文件

注意：这种方法，会递归搜索子目录

**第2种**方法是直接使用grep命令，示例如下

    grep str dir/*        # dir是指某个目录，但不递归搜索其子目录
    grep -r str dir/*    #使用-r选项，递归搜索其子目录
    grep str file        #file是指某个文件

**第3种**方法是综合以上两种，写一个shell脚本，代码如下

    #!/bin/bash
    #find_str.sh   

    if [ $# -lt "2" ]; then
    echo "Usage: `basename $0` path name [option]"
    exit 1
    fi
    #!-r表示递归处理子目录,-i表示忽略大小写
    path=$1
    name=$2
    shift
    shift   

    for option in "$@"
    do
      case $option in
      -r) dir_op="-r"
      ;;
      -i) lu_op="-i"
      ;;
      *) if [ -n "$option" ]; then
      echo "invalid option"
      exit 1
    fi
      ;;
     esac
    done    

    grep_str_of_file()
    {
      file=$1
      str=$2
      out=$(grep -n $lu_op "$str" "$file")
      if [ -n "$out" -a "$file" != "$0" ]; then
      echo "$file: $out"
      fi
     }    

    find_str()
    {
      if [ -d "$1" ]; then
      for file in $1/*
    do
      if [ "$dir_op" = "-r" -a -d "$file" ]; then
    find_str $file $2
      elif [ -f "$file" ]; then
      grep_str_of_file $file $2
      fi
      done
     elif [ -f "$1" ]; then
    grep_str_of_file $1 $2
     fi
    }
    find_str $path $name

这样一来，不管$1参数是目录还是文件，都能处理，使用示例如下：

    ./find_str /usr/include main          # 不递归搜索子目录，大小写敏感
    ./find_str /usr/include main -i       # 不递归搜索子目录，忽略大小写
    ./find_str /usr/include main -r       # 递归搜索子目录，大小写敏感
    ./find_str /usr/include main -r  -i   # 递归搜索子目录，忽略大小写
    ./find_str main.cpp main              # 在文件中搜索，大小写敏感
    ./find_str main.cpp main -i           # 在文件中搜索，忽略大小写

上面所述的示例中，str不限于特定的文本，可以是带正则表达式的匹配模式。
而第3种方法，也可以用sed替换grep来显示文本行，在此基础上能作更多的处理，比如格式化显示、统计匹配的文本个数、搜索策略等，在此就不详究了。