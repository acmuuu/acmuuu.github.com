<?php 
function bin_todec($datalist,$bin){
    static $arr=array('0'=>0,'1'=>1,'2'=>2,'3'=>3,'4'=>4,'5'=>5,'6'=>6,'7'=>7,'8'=>8,'9'=>9,'A'=>10,'B'=>11,'C'=>12,'D'=>13,'E'=>14,'F'=>15);
    if(!is_array($datalist))$datalist=array($datalist);
    if($bin==10)return $datalist; 
    $aOutData=array(); 
    foreach ($datalist as $num){
        $atnum=str_split($num); 
        $atlen=count($atnum);
        $total=0;
        $i=1;
        foreach ($atnum as $tv)
        {
            $tv=strtoupper($tv);
             
            if(array_key_exists($tv,$arr))
            {
                $total=$total+$arr[$tv]*pow($bin,$atlen-$i);
            }
            $i++;
        }
        $aOutData[]=$total;
    }
    return $aOutData;
}

// var_dump(bin_todec(array('ff','33','80'),16));
// var_dump(bin_todec(array('1101101','111101101'),2));
// var_dump(bin_todec(array('1234123','12341'),8));

function decto_bin($datalist,$bin){
	static $arr=array(0,1,2,3,4,5,6,7,8,9,'A','B','C','D','E','F');
	if(!is_array($datalist)) $datalist=array($datalist);
	if($bin==10)return $datalist; 
	$bytelen=ceil(16/$bin); 
	$aOutChar=array();
	foreach ($datalist as $num){
		$t="";
		$num=intval($num);
		if($num===0){
			$t=0;
		}
		while($num>0){
			$t=$arr[$num%$bin].$t;
			$num=floor($num/$bin);
		}
		$tlen=strlen($t);
		if($tlen%$bytelen!=0){
			$pad_len=$bytelen-$tlen%$bytelen;
			$t=str_pad("",$pad_len,"0",STR_PAD_LEFT).$t; 
		}
		$aOutChar[]=$t;
	}
	return $aOutChar;
}

// var_dump(decto_bin(array(128,253),2));
// var_dump(decto_bin(array(128,253),8));
// var_dump(decto_bin(array(128,253),16));

function word_array10($word){
	$string10 = $word;
	$array10 = explode(",",$string10);
	$middle = decto_bin($array10,2);
	// print_r($array10);
	$final=array();
	$b=0;
	$c='';
	foreach ($middle as $num)
	{
		$c = $c.$num;
		$b = $b + 1;
		if ($b == 3){
			$final[] = $c;
			$b = 0;
			$c = '';
		}
	}
	return $final;
}

function word_array16($word){
	$string16 = $word;
	$array16 = explode(",",$string16);
	$array10 = bin_todec($array16,16);
	$middle = decto_bin($array10,2);
	// print_r($array10);
	$final=array();
	$b=0;
	$c='';
	foreach ($middle as $num)
	{
		$c = $c.$num;
		$b = $b + 1;
		if ($b == 3){
			$final[] = $c;
			$b = 0;
			$c = '';
		}
	}
	return $final;
}

function arrayto_list($final){
	$list = '';
	$x = 0;
	$y = 0;
	foreach ($final as $num){
		$array = str_split($num);
		$f = '';
		foreach ($array as $n){
			if($n == 1){
				$f = $f.'['.$x.','.$y.',1],';
			}
			$x = $x + 1;
		}
		$list = $list.$f."\n";
		$y = $y + 1;
		$x = 0;
	}
	return $list;
}


$final1 = word_array10('0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,15,224,127,152,112,65,179,96,25,158,192,25,3,192,25,15,254,17,59,62,63,223,252,48,219,176,0,211,48,254,223,240,224,131,48,1,131,248,15,191,204,7,0,0,0,0,0,0,0,0,0,0,0');

$final2 = word_array10('0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,0,31,247,248,31,143,56,28,7,24,12,7,48,15,247,224,12,199,248,12,199,28,12,199,12,12,255,12,127,247,60,126,7,240,0,7,0,0,7,0,0,7,0,0,0,0,0,0,0,0,0,0');





$final3 = word_array16('FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FD,FF,F7,38,FF,F2,40,3F,F8,D8,CF,F0,80,1F,CC,80,01,F8,FC,F3,F2,F0,1F,C6,C0,0F,8E,87,8F,FC,E0,1F,FC,E7,9F,F8,E3,1F,E1,E0,1F,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF');

$final4 = word_array16('00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,E0,0F,FF,C0,00,10,C0,03,19,C0,00,89,10,1F,FF,F8,19,90,18,1B,FF,D8,18,7F,18,00,E3,00,03,BE,00,1F,1F,80,78,73,FE,07,C0,FC,00,00,18,00,00,00,00,00,00,00,00,00');

$final5 = word_array16('FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,FF,E7,FF,F1,E0,1F,F6,07,FF,FC,00,3F,F9,E7,FF,F0,00,0F,E3,CF,FF,FF,8F,FF,FE,30,FF,F0,0C,FF,F9,E1,FF,FF,C0,7F,FC,1C,01,80,7F,03,FF,FF,C7,FF,FF,FF,FF,FF,FF,FF,FF,FF');

$final6 = word_array16('00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,03,80,00,03,80,00,01,8F,F8,1F,EC,38,1F,FC,18,03,8F,F8,07,CF,F8,0D,EC,18,39,BC,38,79,8F,F8,21,8C,18,01,8C,38,03,8F,F8,03,84,10,01,00,00,00,00,00,00,00,00,00,00,00');

$final7 = word_array16('00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,03,00,00,03,00,00,06,00,00,0F,F0,00,19,F7,F8,21,87,FC,27,F6,18,3F,FE,18,21,86,18,01,C6,18,03,67,F8,07,37,F8,7E,18,00,78,00,00,00,00,00,00,00,00,00,00,00,00,00,00');

$final8 = word_array16('00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,1C,00,00,3C,00,00,1C,00,00,08,00,00,18,00,00');

$final9 = word_array16('00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,03,80,00,03,80,00,01,8F,F8,1F,EC,38,1F,FC,18,03,8F,F8,07,CF,F8,0D,EC,18,39,BC,38,79,8F,F8,21,8C,18,01,8C,38,03,8F,F8,03,84,10,01,00,00,00,00,00,00,00,00,00,00,00');

$final0 = word_array16('00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,E0,0F,FF,C0,00,10,C0,03,19,C0,00,89,10,1F,FF,F8,19,90,18,1B,FF,D8,18,7F,18,00,E3,00,03,BE,00,1F,1F,80,78,73,FE,07,C0,FC,00,00,18,00,00,00,00,00,00,00,00,00');

for($i=1;$i<=24;$i++){
	//$final[$i]=$final3[$i].$final4[$i].$final5[$i].$final6[$i].$final7[$i].$final8[$i].$final9[$i].$final0[$i];
	$final[$i]=$final3[$i].$final4[$i].$final5[$i];
}

echo $lattice = arrayto_list($final);
