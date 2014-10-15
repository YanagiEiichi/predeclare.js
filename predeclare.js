/*********************************************************
Author: 次碳酸钴（admin@web-tinker.com）
Latest: 2014-10-14
Git: https://github.com/YanagiEiichi/predeclare.js
*********************************************************/

var define,require;
(function(){
  //Get the global object ignore strict flag.
  var global=Function("return this")();
  //Detect current JavaScript global environment.
  var environment=function(){
    var e=(global.constructor+"").match(/ (\w+)|$/)[1];
    if(!e)try{
      //An exception will be occurring if run in a WSH environment.
      if(global=="[object]")e="Window"; //IE7-
    }catch(x){ e="WSH"; };
    return e;
  }();
  //To make an error.
  var err=function(){
    var messages={
      INAPPLICABLE_ENVIRONMENT:"Environment Error: 'predeclare.js' is inapplicable to %0 environment.",
      UNKNOWN_ENVIRONMENT:"Environment Error: Unknown JavaScript global environment.",
      NEED_ID:"The 'define' method need an 'id' parameter if current script is not run in any '.js' file.",
      MODULE_NOT_FOUND:"Inline 'require' error, the module not found.",
      GENUINE_FUNCTION_NOT_FOUND:"A function '%0' is called on fake object, but it's not found on genuine object."
    };
    return function(id,args){
      return new Error(messages[id].replace(/%(\d+)/g,function($0,$1){
        return args[$1];
      }));
    };
  }();
  //To wrap the interface function by a simple function,
  //in order to protect the function code.
  var wrap=function(NativeCode){
    "use strict";
    return function(){return NativeCode.apply(this,arguments)};
  };
  //Define a globalEval function and considered IE7-.
  var globalEval=global.execScript||eval;

  /************************** AMD SECTION *************************/
  //Define the module collection. The module collection is actually
  //a function collection, every items are function those use to get
  //module. Because the module is initially a unresolved module (
  //that means the factory function of the module has not yet be
  //called). Those function return a module whatever unresolved or
  //resolved, but it's callback always pass a resolved module.
  var modules={},requireId=1;
  //Define the "require" interface.
  require=wrap(function(dependencies,callback){
    //Make the function overload.
    if(typeof dependencies=="function")
      callback=dependencies,dependencies=[];
    //Convert the dependencies to an array.
    var deps,wasstr=typeof dependencies=="string";
    if(dependencies==null)deps=[];
    else if(wasstr)deps=[dependencies];
    else deps=Array.prototype.slice.call(dependencies,0);
    //Define and return an temporary module and initialize it.
    var id="$"+Date.now()+"_"+requireId++;
    define(id,deps,callback);
    var results=modules[id]().results||{};
    //Return first result if the dependencies was a string.
    if(wasstr)return results[0];
    return results;
  });
  //Define the "config" method on "require" interface,
  //that use to ...
  var settings={paths:{},baseUrl:""};
  require.config=function(e){
    settings=e=e||{paths:{},baseUrl:""};
    e.baseUrl+="",e.paths=e.paths||{};
  };
  //Define the "define" interface.
  var inlineRequireMatcher=/require\s*\(\s*(["'])((?:\\[\s\S]|.)+?)(\1)\s*\)/g;
  define=function(id,dependencies,factory){
    //Make function overload.
    (function(){
      var s=[id,dependencies,factory],i;
      id=dependencies=factory=void 0;
      for(i=0;i<3;i++)
        if(typeof s[i]=="string"&&id===void 0)id=s[i];
        else if(s[i] instanceof Array&&!dependencies)
          dependencies=s[i];
        else if(factory===void 0)factory=s[i];
      id=id||currentId,dependencies=dependencies||[];
      if(id===void 0)id=getCurrentId();
      if(!id)throw err("NEED_ID");
    })();
    if(modules[id]&&!modules[id].isWeak())return;
    //To save inline requires.
    var inlineRequires=[];
    //Convert factory to a function if it's not a function.
    if(typeof factory!="function")factory=function(e){
      return function(){return e;};
    }(factory);
    //Match all inline requires from factory function,
    //if factory is originally a function.
    else while(inlineRequireMatcher.exec(factory))
      inlineRequires.push(RegExp.$2);
    //Put a function to module collection that use to get module.
    predefineModule(id,dependencies,factory,inlineRequires);
    return modules[id].strengthen();
  };
  //Set the amd flag to true.
  define.amd=true;
  //To define a function that use to initialize and get module.
  var predefineModule=function(id,dependencies,factory,inlineRequires){
    //Return this module if it's already exists and not weak.
    if(modules[id]&&!modules[id].isWeak())return modules[id];
    modules[id]=function(oncomplete){
      //Return and call back if the module is already fetched.
      if(state==3)return oncomplete&&oncomplete(module),module;
      //Hold the callback function.
      if(typeof oncomplete=="function")waitingList.push(oncomplete);
      //Fetch dependencies if the module is not yet initialized.
      if(state==1)
        state=2,
        fetchDependencies(module,dependencies||[],function(results){
          module.results=results; //Save the fetching result.
          //Fetch inline dependencies if it's not empty.
          inlineRequires&&inlineRequires.length
            ?require(inlineRequires,fetchComplete)
            :fetchComplete();
        }); //Set fetching state code.
        //Return the unresolved module.
      return module;
    };
    //Define the unresolved module.
    var module={id:id,exports:{}};
    //Define the state code initial 0.
    //state=0 means this is a weak module, it can be overridden.
    //state=1 means the module is not yet initialized.
    //state=2 means dependencies is fetching.
    //state=3 means dependencies fetch completely.
    var state=0;
    //The requires can be holding while the module is fetching.
    var waitingList=[];
    //This function can be calling when the module fetch completely.
    var fetchComplete=function(){
      //Call the factory function pass fetching results as arguments.
      var result=factory&&factory.apply(module.exports,module.results);
      //Ignore undefined result.
      if(result!==void 0)module.exports=result;
      state=3; //Set completion state code.
      //Deal and free the waitingList.
      while(waitingList.length)
        waitingList.pop()(module);
    };
    //To change 0 state to 1.
    modules[id].strengthen=function(){
      if(state==0)state=1;
      return module;
    };
    //To detect that is wrak.
    modules[id].isWeak=function(){ return state==0; };
    return modules[id];
  };
  //To fetch the dependencies chain.
  var fetchDependencies=function(module,dependencies,oncomplete){
    var s=Array.prototype.slice.call(dependencies||[],0);
    if(s[0]===void 0)s[0]="require";
    if(s[1]===void 0)s[1]="exports";
    if(s[2]===void 0)s[2]="module";
    var i,l=s.length,c=l,results=[];
    for(i=0;i<l;i++)(function(i){
      //Get id and method names from dependency string.
      var dependency=parseDependencyString(s[i]);
      //Fetch module.
      switch(dependency.id){
        //Internal modules.
        case "require":return complete({exports:require});
        case "exports":return complete({exports:module.exports});
        case "module":return complete({exports:module});
        //Custom module.
        default:
          var uri=settings.paths[dependency.id]||dependency.id;
          if(uri.slice(-3)!=".js")uri+=".js";
          if(!/^(\w+:|\/)/.test(uri))uri=settings.baseUrl+uri;
          var getModule=modules[dependency.id]||modules[uri];
          if(getModule)return getModule(complete);
          if(dependency.methods){
            var getModule=predefineModule(dependency.id);
            var weakModule=getModule();
            var exports=new Fake(dependency.methods);
            exports.__oncall__=function(){
              delete exports.__oncall__;
              load(uri,function(){
                var getModule=modules[uri]||modules[dependency.id];
                if(getModule&&!getModule.isWeak())
                  return getModule(done);
                define(dependency.id);
                require(dependency.id,done);
              });
              function done(module){
                exports.__expose__(module.exports);
              };
            };
            if(!dependency.defer)exports.__oncall__();
            weakModule.exports=exports;
            complete(weakModule);
          }else load(uri,function(){
            var getModule=modules[uri]||modules[dependency.id];
            if(getModule)return getModule(complete);
            define(dependency.id);
            require(dependency.id,complete);
          });
      };
      function complete(module){
        results[i]=module.exports;
        --c||oncomplete(results);
      };
    })(i);
  };
  //To parse dependency string
  var parseDependencyString=function(s){
    var dependency={methods:null,defer:false};
    s=(s+"").split("#");
    dependency.id=s[0];
    if(s[1]!==void 0){
      if(s[1].charAt(0)=="!"){
        dependency.defer=true;
        s[1]=s[1].slice(1);
      };
      dependency.methods=s[1].split(",");
    };
    return dependency;
  };

  /************************* FAKE SECTION *************************/
  //Defines the Fake constructor.
  var Fake;
  (function(){
    Fake=function(genes){
      var root=build(null,[],-1),base,path,i,j;
      if(typeof genes=="string")genes=[genes];
      //Through the genes to build properties on current instance.
      for(i=0;i<genes.length;i++){
        path=genes[i];
        //Normalize the path to an array.
        if(typeof path=="string")path=path.match(/[$\w]+/g)||[];
        //Walk along the path to the end and build the path. 
        for(j=0,base=root;j<path.length;j++)
          if(base[path[j]]&&base[path[j]].prototype)base=base[path[j]];
          else base=base[path[j]]=build(root,path,j);
      };
      var result=build(root,null,-1);
      //Store the genes in order to generate descendants.
      root.__genes__=genes;
      //Initialize the queue, it's use to store the calling records.
      root.__queue__=[];
      //Copy prototype's property to root.
      for(i in Fake.prototype)root[i]=Fake.prototype[i];
      return root;
    };
    //To build a path item.
    var build=function(root,path,index){
      var interface=wrap(NativeCode);
      //Use the interface function as a heap if without root.
      root=root||interface;
      return interface;
      //Use simple function name.
      function NativeCode(){
        var that=this,args=arguments,genuine=root.__genuine__;
        //If the genuine object of the fake object is exist,
        //a genuine result can be return, else return a fake result.
        if(genuine){
          var fake_base,genuine_base,fake=root,strict;
          //Walk along the path to the end.
          for(var n,i=0;i<=index;i++)
            fake_base=fake,genuine_base=genuine,
            n=path[i],fake=fake[n],genuine=genuine[n]||{};
          //Throw an error if the genuine function is not defined.
          if(typeof genuine!="function")genuine=function(){
            throw err("GENUINE_FUNCTION_NOT_FOUND",[n]);
          };
          //It's the case that call commonly.
          if(that==fake_base)return genuine.apply(genuine_base,args);
          //It's the case that construct by "new" operator.
          else if(that instanceof fake)return function(e){
            for(var s=[],i=0;i<e.length;i++)s.push("e"+i);
            return Function(s+="","return new this("+s+")").apply(genuine,e);
          }(args);
          //Other case that call by either "call" or "apply" methods.
          else return genuine.apply(that,args);
        }else{
          //Create a fake object that inherit genes from root object.
          var result=new Fake(root.__genes__);
          //Record the path, current index in path,
          //"this" object, arguments, and fake result.
          var item=[path,index,that,args,result];
          root.__queue__.push(item);
          //Observe the calling and notify __oncall__ if it's a function.
          root.__oncall__&&root.__oncall__.apply(root,item);
          return result;
        };
      };
    };
    //To replace the fake object by a genuine object,
    //and recurs all recorded actions,
    //and diffuse to descendants.
    Fake.prototype.__expose__=function(genuine){
      this.__genuine__=genuine; //Save the genuine object.
      var item,base,queue,genuineResult,i,j;
      var path,index,that,args,result; //Declare record fields.
      //Get records queue, and delete property from instance.
      queue=this.__queue__,delete this.__queue__;
      //Through the record queue.
      for(i=0;item=queue[i];i++){
        //Extract the recorder item.
        path=item[0],index=item[1],that=item[2];
        args=item[3],result=item[4];
        //Walk along the path to the index location.
        for(j=0,base=this;j<=index;j++)base=base[path[j]];
        //A genuine result can be return in here
        //if the __genuine__ property has been set.
        genuineResult=base.apply(that,args);
        //Diffuse to fake result.
        result.__expose__(genuineResult);
      };
    };
  })();

  /************************ LOADER SECTION ************************/
  //To load a script and listen onload/onerror events.
  var load=function(){
    //To make a solution that is loading with DOM.
    var makeDOMSolution=function(){
      var script=document.createElement("script");
      //Get the HEAD element and considered IE8-.
      var head=document.documentElement.firstChild;
      var isCompleted=/loaded|complete/;
      //Define a SCRIPT initialization function for diffent browsers.
      var initScript=script.onload===null
        //To initialize SCRIPT element for standard browsers.
        ?function(script,onload){
          script.onload=function(){
            script.onload=null;
            onload();
          },script.async=true;
        }
        //To initialize SCRIPT element for IE8-.
        :function(script,onload){
          script.onreadystatechange=function(){
            if(!isCompleted.test(script.readyState))return;
            script.onreadystatechange=null;
            onload();
          },script.defer="defer";
        };
      //To send a request to server with SCRIPT element.
      return function(uri,onload,onerror){
        //Create and initialize a SCRIPT element.
        var script=document.createElement("script");
        initScript(script,function(){
          head.removeChild(script),onload();
        }),script.onerror=function(){
          head.removeChild(script);
          onerror(new Error("Network Error"));
        },script.uri=script.src=uri;
        //Insert the SCRIPT to HEAD and considered IE6-.
        head.insertBefore(script,head.firstChild);
      };
    };
    //To make a solution that is loading with XHR.
    var makeXHRSolution=function(){
      //Define a function that use to create XHR object.
      var createXHR=global.XMLHttpRequest
        //To create a XHR object for standard browsers.
        ?function(){return new XMLHttpRequest;}
        //To create a XHR object for IE6-.
        :function(){return new ActiveXObject("Microsoft.XMLHTTP");}
      return function(uri,onload,onerror){
        //Create a XHR object and send request.
        var xhr=createXHR();
        xhr.onreadystatechange=function(){
          if(xhr.readyState<4)return;
          currentId=uri;
          try{
            //It's a HTTP error if HTTP status code >= 400
            if(xhr.status<400){
              globalEval(xhr.responseText);
            }else throw new Error;
          }catch(e){ return onerror(e); };
          currentId=void 0;
          onload();
        };
        xhr.open("GET",uri,true);
        xhr.send();
      };
    };
    //To make a solution that is loading with importScripts.
    var makeImportScriptsSolution=function(e){
      return function(uri,onload,onerror){
        currentId=uri;
        try{ importScripts(uri); }
        catch(e){ return onerror(e); };
        currentId=void 0;
        onload();
      };
    };
    //Use to store best solutions.
    //[0] is normal solution, [1] is cross-domain solution.
    var solutions=[];
    //Use to store current host.
    var currentHost;
    //Select best solutions.
    switch(environment){
      case "Window": //Is a document environment.
        //Loading with DOM is best solution in this case.
        solutions[0]=solutions[1]=makeDOMSolution();
        currentHost=location.host;
        break;
      case "DedicatedWorkerGlobalScope": //Is a worker environment.
        //XHR supports asynchronous loading but it can't cross domain.
        //importScripts is synchronous, it's an alternative solution.
        solutions[0]=makeXHRSolution();
        solutions[1]=makeImportScriptsSolution();
        currentHost=location.host;
        break;
      case "WSH": //Is a Windows Script Host environment.
        throw err("INAPPLICABLE_ENVIRONMENT",["WSH"]);
      case "Object": //Is a NodeJS environment.
        throw err("INAPPLICABLE_ENVIRONMENT",["NodeJS"]);
      default: //Is a unknown environment.
        throw err("UNKNOWN_ENVIRONMENT");
      break;
    };
    return function(uri,onload,onerror){
      var host=uri.match(/^https?:\/\/([^\/]+)|$/)[1];
      var isCrossDomain=host&&host!=currentHost;
      solutions[isCrossDomain|0](uri,onload,onerror);
    };
  }();
  //To get the id of current active module.
  var getCurrentId=function(){
    //non-browser
    if(environment!="Window")return function(){return currentId;};
    //non-IE
    if("currentScript" in document)return function(){
      var script=document.currentScript;
      if(script)return script.uri;
    };
    //IE10-
    if("readyState" in document.createElement("script"))
      return function(){
        var s=document.getElementsByTagName("script");
        for(var i=0,l=s.length;i<l;i++)
          if(s[i].readyState=="interactive")return s[i].uri;
      };
    //Otherwise
    return function(){
      try{throw new Error;}catch(e){
        var s=e.stack,m=/\((.+?):\d+:\d+\)/g,r=[];
        while(m.exec(s))r.push(RegExp.$1);
        r=r.pop(),s=document.getElementsByTagName("script");
        for(var i=0,l=s.length;i<l;i++)
          if(s[i].src==r&&s[i].uri)return s[i].uri;
      };
    };
  }(),currentId;
})();