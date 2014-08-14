//异步方法预加载模块
//作者：次碳酸钴（admin@web-tinker.com）

var preload=function(){
  var root={},loader={};
  preload.load=load;
  return preload;
  function preload(file,map,methods,immediate){ //接口
    if(file in root)return false;
    if(typeof methods=="boolean")immediate=methods,methods=null;
    if(methods)methods=build(methods);
    if(immediate)touch(file);
    root[file]=[];
    for(var i=0,o,s=build(map);o=s[i];i++)
      generate(o,root[file],methods,file);
    return true;
  };
  function flatten(s){ //参数扁平化处理（全部转换成字符串完整路径）
    if(typeof s=="string")return [s];
    var i,j,t,r=[];
    if(s instanceof Array)
      for(i=0;i<s.length;i++)r.push(flatten(s[i]));
    else if(s instanceof Object)
      for(i in s)for(j in t=flatten(s[i]))r.push(i+"."+t[j]);
    return Array.prototype.concat.apply([],r);
  };
  function build(s){ //建立路径簇
    var m,n,i,o,t;
    var r=/([$\w-]+)(\(\))?/g; //检测是不是调用
    var cluster=[];
    cluster.map={};
    for(s=flatten(s),i=0;i<s.length;i++){
      t=[],o=cluster;
      while(m=r.exec(s[i])){
        name=m[1],isFunction=m[2];
        if(m[2]){ //如果是调用
          //创建一个唯一标识符n，如果n不在map中就创建它
          (n=t+m[1]) in o.map||o.push(o.map[n]=makeNode(m[1],t)),
          o=o.map[n].children,t=[];
        }else //否则只是路径则
          t.push(m[1]);
        if(t.length)o.push(makeNode(null,t));
      };
    };
    return cluster;
  };
  function generate(path,heap,methods,file){ //生成接口操作对象
    var base=cast(path,this),name=path.name;
    if(name)if(!(name in base)){
      if(base==window)globalEval("var "+name+";"); //解决IE8-的BUG
      base[name]=agent;
    };
    function agent(){
      var that=this.constructor!=agent?this==base?null:that=this:1;
      if(heap.solve)return heap.solve(path,that,agent,arguments);
      if(file)touch(file);
      var i,interface={},storage=[];
      heap.push({args:arguments,base:that,path:path,heap:storage});
      if(methods)for(i=0;i<methods.length;i++)
        generate.call(interface,methods[i],storage,methods);
      for(i=0;i<path.children.length;i++)
        generate.call(interface,path.children[i],storage,methods);
      return interface;
    };
  };
  function invoke(func,that,args){ //调用函数（包括new的处理）
    if(that==1){
      for(var s=[],i=0;i<args.length;i++)s.push("e"+i);
      return Function(s+="","return new this("+s+")").apply(func,args);
    }else return func.apply(that,args);
  };
  function actualCall(call,actualbase){ //调用Call实例
    var i,l,result,path=call.path,heap=call.heap,name=path.name;
    actualbase=cast(path,actualbase);
    result=invoke(actualbase[name],call.base||actualbase,call.args);
    for(i=0,l=heap.length;i<l;i++){
      heap[i];
    };
    for(i=0,l=heap.length;i<l;i++)actualCall(heap[i],result);
    heap.solve=makeSolve(result);
  };
  function cast(path,base){ //浇铸路径
    var s=path.path,i=0,name=s[i];
    if(base==window&&!(name in base)) //解决IE8-的BUG
      globalEval("var "+name+";");
    for(;name=s[i];i++)base=base[name]=Object(base[name]);
    return base;
  };
  function makeNode(name,path){ //生成路径结构
    var o={name:name,path:path,children:[]};
    return o.children.map={},o;
  };
  function makeSolve(result){ //生成完成回调
    return function(path,base,agent,args){
      var func=cast(path,result)[path.name];
      if(func!=agent)return invoke(func,base||result,args);
    };
  };
  function touch(file){ //准备请求文件
    if(file in loader)return;
    loader[file]=1;
    preload.load([file],onload);
  };
  function load(requires,onload){ //自带的加载方法
    var host,i;
    for(i=0;i<requires.length;i++)
      host=requires[i].match(/^https?:\/\/([^\/]+)|$/)[1],
      !host||host==location.host
        ?loadWithXHR(requires[i],onload)
        :loadWithDOM(requires[i],onload);
  };
  function loadWithXHR(file,onload){ //XHR方式加载
    var xhr=window.XMLHttpRequest
      ?new XMLHttpRequest
      :new ActiveXObject("Microsoft.XMLHTTP");
    xhr.onreadystatechange=function(){
      if(xhr.readyState<4||xhr.status!=200)return;
      try{
        new Function(xhr.responseText); //检测语法
        throw false;
      }catch(e){
        if(e)return loadWithDOM(file,onload);
        globalEval(xhr.responseText);
        onload(file);
      };
    },xhr.open("GET",file,true),xhr.send();
  };
  function loadWithDOM(file,onload){ //DOM方式加载
    var head,script,ready;
    head=document.documentElement.firstChild;
    script=document.createElement("script");
    script.src=file,script.async="async",script.defer="defer",
    "onload" in script||(script.onreadystatechange=function(){
      if(!/loaded|complete/.test(script.readyState))return;
      script.onreadystatechange=null,script.onload();
    }),script.onload=function(){
      head.removeChild(script),onload(file);
    },ready=function(){
      document.readyState=="loading"
        ?setTimeout(ready,16)
        :head.insertBefore(script,head.firstChild);
    },ready();
  };
  function onload(file){ //加载完成并分配工作
    if(loader[file]!=1)return;
    loader[file]=2;
    for(var i=0,s=root[file],l=s.length;i<l;i++)actualCall(s[i],window);
    root[file].solve=makeSolve(window);
  };
  function globalEval(code){
    return (window.execScript||eval)(code);
  }
}();
