---
layout: post
category : Python
tags : [Python, Error]
title: smtplib AttributeError 'list' object has no attribute 'lstrip'
---
{% include JB/setup %}
使用Python smtplib发送带附件的邮件给多人的时候

    #!/usr/bin/env python
    #-*- coding: utf-8 -*-
    #encoding = utf-8

    import smtplib, mimetypes
    import time
    from email.mime.text import MIMEText  
    from email.mime.multipart import MIMEMultipart  
    from email.mime.image import MIMEImage  

    msg            = MIMEMultipart()  
    msg['From']    = "mail1@163.com"
    #msg['To']     = ["mail1@163.com","mail1@163.com","mail1@163.com"] 会出错
    mail_to        = ["mail1@163.com","mail1@163.com","mail1@163.com"]
    msg['To']      = ', '.join(mail_to)
    msg['Subject'] = "Report " + (time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(time.time())))

    txt = MIMEText("User List \n\n\n")  
    msg.attach(txt)
    fileName = r'user_list.txt'  
    ctype, encoding = mimetypes.guess_type(fileName)  
    if ctype is None or encoding is not None:  
        ctype = 'application/octet-stream'  
    maintype, subtype = ctype.split('/', 1)  
    att1 = MIMEImage((lambda f: (f.read(), f.close()))(open(fileName, 'rb'))[0], _subtype = subtype)  
    att1.add_header('Content-Disposition', 'attachment', filename = fileName)  
    msg.attach(att1)  
    smtp = smtplib.SMTP()  
    smtp.connect('smtp.139.com:25')  
    smtp.login('user', 'password')  
    #smtp.sendmail(msg['From'], msg['To'], msg.as_string()) 会出错  
    smtp.sendmail(msg['From'], mail_to, msg.as_string())  
    smtp.quit()  
    
报如下错误：

    Traceback (most recent call last):
      File "block_user.py", line 116, in <module>
        smtp.sendmail(msg['From'], msg['To'], msg.as_string())
      File "D:\Python25\lib\email\message.py", line 131, in as_string
        g.flatten(self, unixfrom=unixfrom)
      File "D:\Python25\lib\email\generator.py", line 84, in flatten
        self._write(msg)
      File "D:\Python25\lib\email\generator.py", line 116, in _write
        self._write_headers(msg)
      File "D:\Python25\lib\email\generator.py", line 162, in _write_headers
        header_name=h, continuation_ws='\t').encode()
      File "D:\Python25\lib\email\header.py", line 403, in encode
        return self._encode_chunks(newchunks, maxlinelen)
      File "D:\Python25\lib\email\header.py", line 363, in _encode_chunks
        _max_append(chunks, s, maxlinelen, extra)
      File "D:\Python25\lib\email\quoprimime.py", line 97, in _max_append
        L.append(s.lstrip())
    AttributeError: 'list' object has no attribute 'lstrip'

    E:\do_au_block_user>python25 block_user.py

查明原因如下[http://bytes.com/topic/python/answers/472868-sending-emails-list-recipients](http://bytes.com/topic/python/answers/472868-sending-emails-list-recipients)：
    
The problem is that SMTP.sendmail and email.MIMEText need two different things.

email.MIMEText sets up the "To:" header for the body of the e-mail. It is ONLY used for displaying a result to the human being at the other end, and like all e-mail headers, must be a single string. (Note that it does not actually have to have anything to do with the people who actually receive the message.)

SMTP.sendmail, on the other hand, sets up the "envelope" of the message for the SMTP protocol. It needs a Python list of strings, each of which has a single address.

So, what you need to do is COMBINE the two replies you received. Set msg['To'] to a single string, but pass the raw list to sendmail:

    msg['To'] = ', '.join( emails )
    s.sendmail( msg['From'], emails, msg.as_string() )
