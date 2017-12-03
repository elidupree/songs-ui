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
    editable: {phrases: {}},
    generated: {phrases: {}},
    
  };
  
  try {
    const loaded_ui = JSON.parse (filesystem.readFileSync (path.join (project_path, "ui/project.json")));
    project.saved_ui = loaded_ui;
  } catch (e) {
    console.log (e);
    project.saved_ui = {viewed_phrases:{}};
  }
  
  project.path = project_path;
  //project.editable_phrases_directory_path = path.join (project_path, "editable/phrases");
  //project.generated_phrases_directory_path = path.join (project_path, "generated/phrases");
  
  load_phrases ("editable");
  load_phrases ("generated");
};

window.load_phrases = function (category) {
  const names = filesystem.readdirSync (path.join (project.path, category+"/phrases"));
  names.forEach(function(name) {
    load_phrase (category, path.basename (name, ".json"));
    
  });
};

window.phrase_paths = function (category, name) {
  return {
    data: path.join (project.path, `${category}/phrases/${name}.json`),
    ui: path.join (project.path, `${category}/ui/phrases/${name}.json`),
  };
}

window.unload_phrase = function (phrases, name) {
  //phrases [name].element.remove();
  delete phrases [name];
}

window.load_phrase = function (category, name) {
  const phrases = project[category].phrases;
  if (phrases [name]) {
    unload_phrase (phrases, name);
  }
  const paths = phrase_paths (category, name);
  try {
    const loaded_phrase = JSON.parse (filesystem.readFileSync (paths.data));
    if (loaded_phrase) {
      phrases [name] = {
        data: loaded_phrase,
        transient_ui: default_transient_ui (phrases [name]),
      };
      
      try {
        const loaded_ui = JSON.parse (filesystem.readFileSync (paths.ui));
        phrases [name].saved_ui = loaded_ui;
      } catch (e) {
        console.log (e);
        phrases [name].saved_ui = default_saved_ui (phrases [name]);
      }
      
      
    }
  } catch (e) {console.log (e);}
}

window.save_phrase = function (category, name) {
  const paths = phrase_paths (category, name);
  try {
    console.log(paths);
    if (category == "editable") {
      filesystem.writeFileSync (paths.data, JSON.stringify(phrase.data));
    }
    filesystem.writeFileSync (paths.ui, JSON.stringify(phrase.saved_ui));
  } catch(e){console.log(e)}
}
window.save_phrase_ui = function (category, name) {
  const paths = phrase_paths (category, name);
  try {
    console.log(paths);
    filesystem.writeFileSync (paths.ui, JSON.stringify(phrase.saved_ui));
  } catch(e){console.log(e)}
}


let playback_start = 0.0;
let playback_end = 10.0;


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
