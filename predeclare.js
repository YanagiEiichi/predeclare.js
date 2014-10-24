/*********************************************************
Author: 次碳酸钴 (admin@web-tinker.com)
Latest: 2014-10-18
Git: https://github.com/YanagiEiichi/predeclare.js
*********************************************************/

var define,require;
(function(){
  /************************* GLOBAL SECTION ***********************/
  //Get the global object ignore strict flag.
  var global=Function("return this")();
  //Detect current JavaScript global environment.
  var environment=function(){
    var e=(global.constructor+"").match(/ (\w+)|$/)[1];
    if(!e)try{
      //An exception will be occurring if run in a WSH environment.
      if(global=="[object]")e="Window"; //IE7-
    }catch(x){ e="WSH"; };
    if(/Window/.test(e))e="Window"; //Safari, UC, etc.
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
  (function(){
    var modules={},requireId=1,anonymousQueue=[],uriMap={};
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
      var id="$"+new Date*1+"_"+requireId++;
      var args=[];
      define(id,deps,function(){
        callback&&callback.apply(this,arguments);
        return wasstr?arguments[0]:Array.prototype.slice(arguments,0);
      });
      return modules[id].getExports();
    });
    //Define the "config" method on "require" interface.
    var settings={paths:{},baseUrl:""};
    require.config=function(args){
      settings.paths=args.paths||{};
      settings.baseUrl=args.baseUrl||"";
    };
    //Define the "define" interface.
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
        dependencies=dependencies||[];
        //Try to get current uri and get the default id.
        if(id===void 0)id=uriMap[getCurrentUri()];
      })();
      //If the id is not specified, push other arguments to anonymous queue.
      if(id===void 0)
         return void anonymousQueue.push([dependencies,factory]);
      //Parse the id as the Predeclaration Grammar.
      var predeclaration=parsePredeclaration(id);
      var id=predeclaration.id;
      //Return, If this module is already exists.
      if(modules[id])return;
      //Make the factory to a function if it's not a function.
      if(typeof factory!="function")factory=function(e){
        return function(){return e;};
      }(factory);
      //Put the module to the module collection.
      modules[id]=new Module(predeclaration,dependencies,factory);
    };
    //Set the amd flag to true.
    define.amd=true;
    //Define the Module constructor.
    var Module=function(predeclaration,dependencies,factory){
      var module=this;
      module.id=predeclaration.id;
      //Define an internal event that will be triggered when all the
      //dependencies are resolved.
      var onresolve;
      //Define a "getExports" method that's used to get the "exports".
      //It's a asynchronous method, pass the "exports" back by callback function.
      //If the "exports" is not existed, wait until it's existing.
      module.getExports=function(){
        //Set the event handle of the internal event "onresolve".
        //It's used to deal the callbackHolder of the getExports method.
        onresolve=function(){
          var callback;
          while(callback=callbackHolder.pop())callback(module.exports);
        };
        var callbackHolder=[];
        return function(callback){
          //Trigger the onfetchneeded event if defer flag is unset.
          if(!predeclaration.defer)onfetchneeded();
          //If the "exports" has existed, call synchronously back.
          if(module.exports)return callback&&callback(module.exports),module.exports;
          //Other case that this module is unresolved, hold the callback.
          if(typeof callback=="function")callbackHolder.push(callback);
        };
      }();
      //Initialize the "exports" to a fake object,
      //if Predeclaration Grammar is used.
      if(predeclaration.methods){
        module.exports=new Fake(predeclaration.methods);
        //Trigger the onfetchneeded event in first call if defer flag is set.
        if(predeclaration.defer)module.exports.__oncall__=function(){
          delete module.exports.__oncall__;
          onfetchneeded();
        };
      };
      //Define an internal event that will be triggered on fetch needed.
      var onfetchneeded=function(){
        //This is a one-off event.
        onfetchneeded=function(){};
        //Fetch the dependencies, and get their "exports", this process 
        //may be asynchronous if any asynchronous module exists in the
        //dependenciy list. otherwise no asynchronous module exists here,
        //this process will be synchronous.
        fetchDependencies(dependencies,function(results){
          //Save the virtual exports and set the exports to an empty object.
          var virtualExports=module.exports;
          module.exports={};
          //Default the values of the results.
          results[0]=results[0]||require;
          results[1]=results[1]||module.exports;
          results[2]=results[2]||module;
          //Call the factory function and pass the results as its arguments.
          var result=factory.apply(module.exports,results);
          //If factory function return a defined value, use it as exports.
          if(result!==void 0)module.exports=result;
          //Expose the virtual exports with actual exports if it' existed.
          if(virtualExports)virtualExports.__expose__(module.exports);
          //Finally, trigger the onresolve event.
          onresolve();
        });
      };
    };
    var fetchDependencies=function(dependencies,callback){
      var results=[],count=dependencies.length;
      if(count==0)return callback(results);
      //Through all the dependencies.
      for(var i=0;i<dependencies.length;i++)(function(index){
        //Define an internal event that trigger when the exports is got.
        function onresult(exports){
          results[index]=exports;
          //Call back, if all the dependencies are resolved.
          --count||callback(results);
        };
        //Parse the dependency id as the Predeclaration Grammar.
        var predeclaration=parsePredeclaration(dependencies[index]);
        var id=predeclaration.id,methods=predeclaration.methods,module=modules[id];
        //If the module is existed, Call its getExports methods and pass the
        //"onresult" event handle as its callback function.
        //This progress may be synchronous if the module is synchronous or
        //has been resolved, otherwise it's asynchronous. 
        if(module)module.getExports(onresult);
        //Module is not existed.
        else {
          //Make an URI with dependency id.
          var uri=settings.paths[id]||id;
          if(/^\w+$/.test(uri))uri+=".js";
          if(!/^(\w+:|\/)/.test(uri))uri=settings.baseUrl+uri;
          //If the Predeclaration Grammar is used.
          if(methods)(function(){
            //To used to launch the request.
            var launch=function(){
              //Map the uri to id, before the "laod".
              uriMap[uri]=id;
              load(uri,function(){
                //Trigger the onloaded syncronous event.
                onloaded();
                //Get the exports while the module is resolved.
                modules[id].getExports(function(exports){
                  //Expose the fake object with actual exports.
                  fake.__expose__(exports);
                });
              },onerror);
            };
            //Make a Fake object as a virtual module exports.
            var fake=new Fake(methods);
            //Don't launch until any predeclared methods is called, if defer flag
            //of predeclaration is true, else launch immediately.
            if(predeclaration.defer)fake.__oncall__=function(){
              delete fake.__oncall__,launch();
            }; else launch();
            //Use the fake as the result.
            onresult(fake);
          })();
          //Other case that Predeclaration Grammar isn't used.
          //Launch immediately the request.
          else {
            //Map the uri to id, before the "laod".
            uriMap[uri]=id;
            load(uri,function(){
              //Trigger the onloaded syncronous event.
              onloaded();
              //Get the exports while the module is resolved, and use it'as the result.
              modules[id].getExports(function(exports){
                onresult(exports);
              });
            },onerror);
          };
        };
        //Define the loading error internal event handle
        function onerror(type){
          console.log("'"+uri+"' is loading error with "+type+" method.");
        };
        //Define the loaded internal event handle
        function onloaded(){
          //Define this module if it's not existed yet.
          if(!modules[id]){
            //Get the last item of anonymousQueue as this module if that's not empty,
            //else define a empty module as this module.
            var definition=anonymousQueue.pop();
            definition?define.apply(null,[id].concat(definition)):define(id,{});
            //Clear the anonymousQueue.
            anonymousQueue=[];
          };
        };
      })(i);
    };
    //To parse dependency string
    var parsePredeclaration=function(s){
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
    //To used to get the uri of current SCRIPT tag.
    //However, it's sometimes got impossibly, because some browsers or not a
    //browser environment don't support any way to get this value.
    var getCurrentUri=function(){
      //Return a empty function, if environment is not Window.
      if(environment!="Window")return function(){};
      //Return the function that return currentScript, if it's supported.
      if("currentScript" in document)return function(){
        return document.currentScript;
      };
      //Return the uri of interactiving SCRIPT, if readyState is supported.
      if("readyState" in document.createElement("script"))
        return function(){
          var i,s=document.getElementsByTagName("script");
          for(i=0;i<s.length;i++)
            if(s[i].readyState=="interactive"&&s[i].uri)
              return s[i].uri;
        };
      //Otherwise, return a emtpy function.
      return function(){};
    }();
  })();
  
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
  //The three parameters are uri,onload and onerror.
  var load;
  (function(){
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
          script.addEventListener("load",handle);
          function handle(){
            script.removeEventListener("load",handle);
            onload();
          };
        }
        //To initialize SCRIPT element for IE8-.
        :function(script,onload){
          script.attachEvent("onreadystatechange",handle);
          function handle(){
            if(!isCompleted.test(script.readyState))return;
            script.detachEvent("onreadystatechange",handle);
            onload();
          };
        };
      //To send a request to server with SCRIPT element.
      return function(uri,onload,onerror){
        //Create and initialize a SCRIPT element.
        var script=document.createElement("script");
        script.async=true,script.defer="defer";
        initScript(script,function(){
          head.removeChild(script),onload();
        }),script.onerror=function(){
          head.removeChild(script);
          onerror&&onerror("DOM");
        },script.src=script.uri=uri;
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
          try{
            //It's a HTTP error if HTTP status code >= 400
            if(xhr.status<400){
              globalEval(xhr.responseText);
            }else return onerror&&onerror("XHR");
          }catch(e){ console.log(e); };
          onload();
        };
        xhr.open("GET",uri,true);
        xhr.send();
      };
    };
    //To make a solution that is loading with importScripts.
    var makeImportScriptsSolution=function(e){
      return function(uri,onload,onerror){
        try{ importScripts(uri); }
        catch(e){ return onerror&&onerror("ImportScripts"); };
        onload();
      };
    };
    //The "solutions" is used to store best solutions.
    //The "currentHost" is used to detect the request who is cross-domain.
    //[0] is normal solution, [1] is cross-domain solution.
    var solutions=[],currentHost;
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
    load=function(uri,onload,onerror){
      var host=uri.match(/^https?:\/\/([^\/]+)|$/)[1];
      var isCrossDomain=host&&host!=currentHost;
      solutions[isCrossDomain|0](uri,onload,onerror);
    };
  })();
})();