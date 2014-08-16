//admin@web-tinker.com

var preload=function(){
  var root={},loader={};
  preload.load=load;
  return preload;
  function preload(file,map,methods,immediate){
    if(file in root)return false;
    if(typeof methods=="boolean")immediate=methods,methods=null;
    if(methods)methods=build(methods);
    if(immediate)touch(file);
    root[file]=[];
    for(var i=0,o,s=build(map);o=s[i];i++)
      generate(o,root[file],methods,file);
    return true;
  };
  function flatten(s){
    if(typeof s=="string")return [s];
    var i,j,t,r=[];
    if(s instanceof Array)
      for(i=0;i<s.length;i++)r.push(flatten(s[i]));
    else if(s instanceof Object)
      for(i in s)for(j in t=flatten(s[i]))r.push(i+"."+t[j]);
    return Array.prototype.concat.apply([],r);
  };
  function build(s){
    var m,n,i,o,t;
    var r=/([$\w-]+)(\(\))?/g;
    var cluster=[];
    cluster.map={};
    for(s=flatten(s),i=0;i<s.length;i++){
      t=[],o=cluster;
      while(m=r.exec(s[i])){
        name=m[1],isFunction=m[2];
        if(m[2]){
          (n=t+m[1]) in o.map||o.push(o.map[n]=makeNode(m[1],t)),
          o=o.map[n].children,t=[];
        }else
          t.push(m[1]);
        if(t.length)o.push(makeNode(null,t));
      };
    };
    return cluster;
  };
  function generate(path,heap,methods,file){
    var base=cast(path,this),name=path.name;
    if(name)if(!(name in base)){
      if(base==window)globalEval("var "+name+";");
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
  function invoke(func,that,args){
    if(that==1){
      for(var s=[],i=0;i<args.length;i++)s.push("e"+i);
      return Function(s+="","return new this("+s+")").apply(func,args);
    }else return func.apply(that,args);
  };
  function actualCall(call,actualbase){
    var i,l,result,path=call.path,heap=call.heap,name=path.name;
    actualbase=cast(path,actualbase);
    result=invoke(actualbase[name],call.base||actualbase,call.args);
    for(i=0,l=heap.length;i<l;i++){
      heap[i];
    };
    for(i=0,l=heap.length;i<l;i++)actualCall(heap[i],result);
    heap.solve=makeSolve(result);
  };
  function cast(path,base){
    var s=path.path,i=0,name=s[i];
    if(base==window&&!(name in base))
      globalEval("var "+name+";");
    for(;name=s[i];i++)base=base[name]=Object(base[name]);
    return base;
  };
  function makeNode(name,path){
    var o={name:name,path:path,children:[]};
    return o.children.map={},o;
  };
  function makeSolve(result){
    return function(path,base,agent,args){
      var func=cast(path,result)[path.name];
      if(func!=agent)return invoke(func,base||result,args);
    };
  };
  function touch(file){
    if(file in loader)return;
    loader[file]=1;
    preload.load([file],onload);
  };
  function load(requires,onload){
    var host,i;
    for(i=0;i<requires.length;i++)
      host=requires[i].match(/^https?:\/\/([^\/]+)|$/)[1],
      !host||host==location.host
        ?loadWithXHR(requires[i],onload)
        :loadWithDOM(requires[i],onload);
  };
  function loadWithXHR(file,onload){
    var xhr=window.XMLHttpRequest
      ?new XMLHttpRequest
      :new ActiveXObject("Microsoft.XMLHTTP");
    xhr.onreadystatechange=function(){
      if(xhr.readyState<4||xhr.status!=200)return;
      try{
        new Function(xhr.responseText);
        throw false;
      }catch(e){
        if(e)return loadWithDOM(file,onload);
        globalEval(xhr.responseText);
        onload(file);
      };
    },xhr.open("GET",file,true),xhr.send();
  };
  function loadWithDOM(file,onload){
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
  function onload(file){
    if(loader[file]!=1)return;
    loader[file]=2;
    for(var i=0,s=root[file],l=s.length;i<l;i++)actualCall(s[i],window);
    root[file].solve=makeSolve(window);
  };
  function globalEval(code){
    return (window.execScript||eval)(code);
  }
}();
