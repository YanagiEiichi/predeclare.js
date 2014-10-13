define(function(){
  return function(msg){
    console.log((performance.now()|0)+"ms "+msg);
  };
});