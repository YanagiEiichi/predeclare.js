define({
  getById:function(id){
    return document.getElementById(id);
  },bindEvent:function(e,en,cb){
    if(e.addEventListener)
      e.addEventListener(en,cb);
    else
      e.attachEvent("on"+en,cb);
  },log:function(msg){
    msg="<div>"+msg+"</div>";
    document.body.insertAdjacentHTML("beforeend",msg);
  }
});