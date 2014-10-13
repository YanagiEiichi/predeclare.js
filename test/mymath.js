define(function(){
  var f=function(){};
  f.pythagorus=function(a,b,cb){
    cb(Math.sqrt(a*a+b*b));
  };
  return f;
});