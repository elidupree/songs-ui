const electron = require('electron');
const filesystem = require ("fs");
const path = require ("path");
const chokidar = require("chokidar");


window.unload_project = function() {
  window.project.element.remove();
  delete window.project;
};
window.load_project = function(project_path) {
  
  if (window.project) {window.unload_project();}
  
  const project = window.project = {
    editable_phrases: {},
    generated_phrases: {},
    
  };
  
  project.path = project_path;
  project.editable_phrases_directory_path = path.join (project_path, "editable/phrases");
  project.generated_phrases_directory_path = path.join (project_path, "generated/phrases");
  
  load_phrases (project.editable_phrases_directory_path, project.editable_phrases);
  load_phrases (project.generated_phrases_directory_path, project.generated_phrases);
};

window.load_phrases = function (phrases_type, phrases) {
  const names = filesystem.readdirSync (phrases_path);
  names.forEach(function(name)
    load_phrase (phrases_path, phrases, path.basename (name, ".json"));
    
  });
};

window.unload_phrase = function (phrases, name) {
  phrases [name].element.remove();
  delete phrases [name];
}

window.load_phrase = function (phrases_path, phrases, name) {
  if (phrases [name]) {
    unload_phrase (phrases, name);
  }
  const phrase_path = path.join (project.path, `${category}/phrases/${name}.json`);
  const phrase_ui_path = path.join (project.path, `${category}/ui/phrases/${name}.json`);
  try {
    const loaded_phrase = JSON.parse (filesystem.readFileSync (phrase_path));
    if (loaded_phrase) {
      phrases [name] = {
        data: loaded_phrase,
        transient_ui: default_transient_ui (phrases [name]),
      };
      
      try {
        const loaded_ui = JSON.parse (filesystem.readFileSync (phrase_path));
        phrases [name].saved_ui = loaded_ui;
      } catch (e) {
        console.log (e);
        phrases [name].saved_ui = default_saved_ui (phrases [name]);
      }
      
      
    }
  } catch (e) {console.log (e);}
}


let phrases_metadata = {}
let playback_start = 0.0;
let playback_end = 10.0;
let 


const tags = {};
window.discover_tag = function (tag) {
  let result = tags [tag];
  if (!result) {
    result = tags [tag] = {
      red: Math.random()*200+30, blue: Math.random()*200+30, green: Math.random()*200+30,
      tag: tags,
    };
  }
  return result;
}
