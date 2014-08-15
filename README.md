#异步方法预加载实现
###概念：
　　[关于模块预实现的设想](http://www.web-tinker.com/article/20386.html)
###接口：
```JavaScript
void preload(file,map[,methods][,immediate]);
```
　　**preload.js**只提供了一个函数`preload`，它用于异步加载文件`file`，并根据提供的文件头`map`，对`map`中描述的方法在代码环境中做预定义。这可以解决一些库文件加载完成前调用方法时找不到相应的方法，这些预定义的方法被调用之后会记录到下调用顺序，在文件加载完毕后调用真正的方法。接着的可选参数`methods`用于配置链式调用中的方法名，它的参数格式和`map`相同，但它不会被定义到全局，却可以在每一个调用的返回对象中做链式调用。另一个可选参数`immediate`，其默认为**false**，这意味着初始不加载文件，只有首次调用相关方法时才去加载。如果这个参数设置为**true**，则表示在当前消息结束后立即发起异步加载。

---------------------------------------

###基本用法：
　　`map`参数的格式，可以是字符串、数组、对象的有机组合。比如：
```JavaScript
preload("filepath",{$:["get()","post()"]});
//等价与
preload("filepath",["$.get()","$.post()"]);
```
　　方法名后面记得加对小括号，方法链可以在小括号后面继续添加方法，比如：
```JavaScript
preload("filepath","$().css().attr()"); //定义
$("div").css("xx","xx").attr("xx","xx"); //调用
```
#####演示程序 A1：基本用法
```HTML
<script src="http://www.web-tinker.com/preload.js"></script>
<input id="iterator" value="0" type="button" />
<script>
//预加载jQuery并附带一些方法
preload("http://code.jquery.com/jquery-1.10.2.min.js",{
  "$()":["css().find().on()","append()"]
});

//jQuery没加载之前，这些方法就可以调用了
$("body").css("background","#EEE").find("input").on("click",function(){
  $("body").append("<div>"+iterator.value+"</div>");
});

//不依赖jQuery的代码在jQuery加载之前是正常工作的
setInterval(function(){
  iterator.value++;
},16);
</script>
```
#####演示程序 A2：存储结果
```HTML
<script src="http://www.web-tinker.com/preload.js"></script>
<input id="iterator" value="0" type="button" />
<script>
//预加载jQuery并附带一些方法
preload("http://code.jquery.com/jquery-1.10.2.min.js",[
  "$().css().find().on()","$().append()"
]);

//储存为变量也是可以使用的，但是要注意$body不是jquery对象
var $body=$("body");
$body.css("background","#EEE").find("input").on("click",function(){
  $body.append("<div>"+iterator.value+"</div>");
  console.log(!!$body.jquery); //输出为false，因为它不是jquery对象！
});

//不依赖jQuery的代码在jQuery加载之前是正常工作的
setInterval(function(){
  iterator.value++;
},16);
</script>
```
#####演示程序 A3：构造器用法
```JavaScript
//test.js
function F(){this.i=0;};
F.prototype.test=function(){
  this.body.append("<div>"+this.i+++"</div>");
};
F.prototype.body=$("body"); //不必在意jQuery是否加载完成
```
```HTML
<script src="http://www.web-tinker.com/preload.js"></script>
<input value="test" type="button" />
<script>
preload("jquery-1.10.2.min.js",{"$()":["append()","click()"]});
preload("test.js","F().test()");

var f=new F; //允许使用new创建预加载的类实例
console.log(f instanceof F); //输出为false 其不是真正的实例
$("input").click(function(){
  f.test();
});
</script>
```
#####演示程序 A4：使用methods的链式用法
```HTML
<script src="http://www.web-tinker.com/preload.js"></script>
<script>
preload("http://code.jquery.com/jquery-1.10.2.min.js","$()",[
  "css()","attr()","val()","on()","append()","appendTo()"
]);

var $body=$("body");
//在methods参数提供的方法可以出现在任何链式调用中
$("<input/>")
  .attr("type","button").val("test").css("fontWeight","bold")
  .appendTo("body") //不能使用$body，因为$body不是真正的jQuery对象
  .on("click",function(){
    //从预加载得到的东西只能用于调用方法，不能作为其它函数的参数
    $body.append("<div>test</div>");
  });

//但methods参数提供的方法不会被定义到全局作用域上
console.log(window.appendTo); //undefined
</script>
```
###高级用法：
　　考虑到封装中加载代码的方式可能不能满足需求，开发者可能有更好的加载方式。所以在加载程序的部分提供了接口。但程序默认已经自带了一套加载方式，如果没有特殊需求建议不要覆写这个方法。
```JavaScript
preload.load=function(requires,onload){
  //TODO
};
```
　　第一个参数`requires`是请求的资源集合，它是一个字符串数组。里面的每一项是一个资源，可能是完整URL，也可能是相对路径，这与调用`preload`时传入的第一个参数有关。第二个参数`onload`是一个函数，当某个资源加载并执行完成后，应该将资源在`requires`中的名称传入作为参数传入`onload`，以告诉程序准备完成。加载顺序是无关紧要的，只要保证所有的资源都加载并执行即可。
#####演示程序 B1：自定义加载方式
```HTML
<script src="http://www.web-tinker.com/preload.js"></script>
<input id="iterator" value="0" type="button" />
<script>
preload(
  "http://code.jquery.com/jquery-1.10.2.min.js",
  "$()",["css()","find()","on()","append()"],true
);
    
//自定义加载程序
preload.load=function(requires,onload){
  var i,head=document.head,script;
  for(i=0;i<requires.length;i++)(function(file){
    script=document.createElement("script"),
    script.src=file,
    script.onload=function(){
      console.log("代码加载完成");
      onload(file);
    },head.appendChild(script);
  })(requires[i]);
};

//jQuery没加载之前，这些方法就可以调用了
$("body").css("background","#EEE").find("input").on("click",function(){
  $("body").append("<div>"+iterator.value+"</div>");
});

//不依赖jQuery的代码在jQuery加载之前是正常工作的
setInterval(function(){
  iterator.value++;
},16);
</script>
```
