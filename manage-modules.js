
var logger = log4js.getLogger('manageModules');
nconf.file ({file: './settings.json'});

exports.moduleLoader = function (session){
  
      logger.info("\n\n[MODULES] - Module loader starting...");
      logger.debug('[MODULES] - WAMP SESSION status: '+session.isOpen);
      
      try{
        //Reading the plugin configuration file
        var modules = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

	var modules_list = modules["modules"];
	logger.debug("[MODULES] - Modules injected: " + JSON.stringify(modules_list) );
	

	for(var module in modules_list) {
	      //logger.debug("module: "+module+", conf: "+JSON.stringify(modules_list[module],null,"\t"));
	      module_status = nconf.get('modules:'+module+':status');
	      logger.info("module: "+module+", status: "+module_status);
	      
	      if(module_status === "loaded"){
	    
		var library_file = './modules/'+ module +'/main';
		logger.info('[MODULES] - File: '+ library_file);
		
		var library = require(library_file);

		library.init(module);
		library.exportModuleCommands(session);
	    
	      }
	}

      }
      catch(err){
	  logger.error('[MODULES] --> Error parsing JSON file ./settings.json');
      }

} 


exports.moduleDirLoader = function (session){
  
      logger.info("\n\n[MODULES] - Module loader starting...");
      logger.debug('[MODULES] - WAMP SESSION status: '+session.isOpen);
      
      function getDirectories(srcpath) {
	  return fs.readdirSync(srcpath).filter(function(file) {
	    return fs.statSync(path.join(srcpath, file)).isDirectory();
	  });
      }
      

      var modules_list = getDirectories("./modules");
      logger.info("[MODULES] - Modules injected: " + JSON.stringify(modules_list) );
      
      modules_list.forEach(function(module) {
	    
	    module_status = nconf.get('modules:'+module+':status');
	    
	    if(module_status === "loaded"){
	    
		var library_file = './modules/'+ module +'/main';
		logger.info('[MODULES] - File: '+ library_file);
		
		var library = require(library_file);

		library.init(module);
		library.exportModuleCommands(session);
	    
	    }
	  
      });  

} 