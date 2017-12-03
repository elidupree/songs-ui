const electron = require('electron');
const _ = require('lodash');

function make_phrase_canvas() {
  return $("<canvas>");
}

window.initialize_project_ui = function() {
  const metadatas = [
    make_phrase_element ("editable"),
    make_phrase_element ("generated"),
    
  ];
  const phrases_list = $("<div>");
  project.element = $("<div>", {class: "project"}).append (
    $("<div>", {class: "phrase_editor"}).append (
      metadatas [0].element,
      phrases_list,
    ),
    $("<div>", {class: "rendered_phrase_display"}).append (
      metadatas [1].element,
      
    ),
  );
  document.getElementById ("phrases").appendChild (project.element [0]);
  
  _.forOwn(project.editable.phrases, (phrase, name) => {
    phrases_list.append($("<div>").append(
      $("<input>", {type: "radio", id: `${name}_edit_select`, name: "phrase_edit_select", value: name, checked: project.saved_ui.edited_phrase === name}).click (()=>{project.saved_ui.edited_phrase = name;}),
      $("<label>", {for: `${name}_edit_select`, text: name}),
      $("<input>", {type: "checkbox", id: `${name}_view_select`, name: "phrase_view_select", value: name, checked: project.saved_ui.viewed_phrases[name] !== false}).click (()=>{project.saved_ui.viewed_phrases[name] = $(`#${name}_view_select`).prop("checked");}),
      $("<label>", {for: `${name}_view_select`, text: name}),
    ));
  });
  
  
  function update() {
    metadatas.forEach(metadata => {
      metadata.redraw();
    });
  }
  
  setInterval (update, 100);
}


window.default_transient_ui = function() {return {}};
window.default_saved_ui = function() {return {selected_notes:{}}};

function edited_phrase() {return project.editable.phrases[project.saved_ui.edited_phrase];}

function make_phrase_element (category) {
  let metadata = {};
  let div = metadata.element = document.createElement ("div");
  let canvas = document.createElement ("canvas");
  let context = canvas.getContext ("2d");
  div.appendChild (canvas) ;
  
  let options = document.createElement ("div");
  div.appendChild (options) ;
  
  options.innerHTML = `
  Grid increment:
  <input type="number" id="${category}_grid_numerator" value=1 min=1 max=100 step=1 />
  /
  <input type="number" id="${category}_grid_denominator" value=4 min=1 max=100 step=1 />
  seconds.
  `
  
  let tags_box;
  $(options).append(
    tags_box = $("<div>"),
  );
  
  metadata.grid_inputs = function() {
    return {
      numerator: document.getElementById (`${category}_grid_numerator`).valueAsNumber,
      denominator: document.getElementById (`${category}_grid_denominator`).valueAsNumber,
    };
  };
  
  metadata.grid_step_size = function() {
    let inputs = metadata.grid_inputs();
    return inputs.numerator/inputs.denominator;
  }
  
  metadata.snap_time_to_grid = function (time) {
    let inputs = metadata.grid_inputs();
    if (inputs.numerator === 0 || inputs.denominator === 0 || isNaN (inputs.numerator) || isNaN (inputs.denominator)) {return time;}
    let increments = Math.round (time*inputs.denominator/inputs.numerator);
    //console.log (time, increments, inputs.numerator, inputs.denominator);
    return increments*inputs.numerator/inputs.denominator;
  };
  metadata.snap_frequency_to_semitones = function (frequency) {
    return midi_pitch_to_frequency(frequency_to_nearest_midi_pitch(frequency));
  };
  
  metadata.iterate_phrases = function (callback) {
    const phrases = project[category].phrases;
    _.forOwn(phrases, callback);
  };
  metadata.iterate_notes = function (callback) {
    metadata.iterate_phrases((phrase, name) => {
      phrase.data.notes.forEach((note, index) => callback(note, index, phrase, name));
    });
  };
  
  metadata.update_dimensions = function() {
    const phrases = project[category].phrases;
    metadata.dimensions = phrases_dimensions (phrases);
     
    canvas.setAttribute ("width", metadata.dimensions.canvas_width);
    canvas.setAttribute ("height", metadata.dimensions.canvas_height);
  };
  
  metadata.update_dimensions();
  
  let mouse_coordinates = function (event) {
    return get_coordinates(metadata.dimensions, event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
  };
  
  let get_overlapping_note = function (coordinates) {
    return phrase.data.notes.find(function(note) {
      const coordinates = node_coordinates (note);
      if ( coordinates.canvas_min_x < coordinates.canvas_x
        && coordinates.canvas_max_x > coordinates.canvas_x
        && coordinates.canvas_min_y_downwards < coordinates.canvas_y_downwards
        && coordinates.canvas_max_y_downwards > coordinates.canvas_y_downwards) {
        return true;
      }
    }) || null;
  };
  let get_overlapping_notes = function (x1,y1,x2,y2) {
    return phrase.data.notes.filter(function(note) {
      const coordinates = node_coordinates (note);
      //console.log (x1,y1,x2,y2, note) ;
      /*console.log (
        coordinates.canvas_min_x < x1,
        coordinates.canvas_min_x < x2,
        coordinates.canvas_max_x > x1,
        coordinates.canvas_max_x > x2,
        coordinates.canvas_min_y_downwards < y1,
        coordinates.canvas_min_y_downwards < y2,
        coordinates.canvas_max_y_downwards > y1,
        coordinates.canvas_max_y_downwards > y2) ;*/
      if ( (coordinates.canvas_min_x < x1 ||
            coordinates.canvas_min_x < x2)
        && (coordinates.canvas_max_x > x1 ||
            coordinates.canvas_max_x > x2)
        && (coordinates.canvas_min_y_downwards < y1 ||
            coordinates.canvas_min_y_downwards < y2)
        && (coordinates.canvas_max_y_downwards > y1 ||
            coordinates.canvas_max_y_downwards > y2)
        ) {
        //console.log (x1,y1,x2,y2, note) ;
        return true;
      }
      return false;
    });
  };
  
  let drag_select = null;
  let drag_move = null;
  let dragged_note = function (note) {
    let result = copy_note(note);
    
    if (drag_move.ends_only) {
      let time_shift = metadata.snap_time_to_grid(drag_move.reference_note.end + drag_move.current_coordinates.time - drag_move.original_coordinates.time) - drag_move.reference_note.end;
      result.end += time_shift;
      result.end = Math.max(result.end, Math.min(note.end, result.start + metadata.grid_step_size()));
    }
    else {
      let time_shift = metadata.snap_time_to_grid(drag_move.reference_note.start + drag_move.current_coordinates.time - drag_move.original_coordinates.time) - drag_move.reference_note.start;
      result.start += time_shift; result.end += time_shift;
      
      let frequency_shift = metadata.snap_frequency_to_semitones (drag_move.reference_note.frequency * drag_move.current_coordinates.frequency / drag_move.original_coordinates.frequency) / drag_move.reference_note.frequency;
      result.frequency *= frequency_shift;
    }

    return result;
  };
  
  let draw_note = function(index, note, phrase_name) {
    const coordinates = note_coordinates (metadata.dimensions, note);
    
    let color = to_rgb("#000000");
    note.tags.forEach(function(tag) {
      let info = discover_tag (tag);
      color.red += info.red; color.blue += info.blue; color.green += info.green;
    });
    //console.log (color);
    if (note.tags.length > 0) {
      color.red /= note.tags.length; color.blue /= note.tags.length; color.green /= note.tags.length;
    }
    //console.log (color);
    //console.log (to_css_color(color));
    context.fillStyle = to_css_color(color);
    //console.log (metadata.dimensions, coordinates);
    context.fillRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    //console.log(edited_phrase());
    if (project.saved_ui.edited_phrase === phrase_name && edited_phrase().saved_ui.selected_notes [index]) {
      context.strokeRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    }
  };
  
  let redraw = metadata.redraw = function() {
    context.fillStyle = "#eee";
    //context.fillRect(0,0,metadata.width,metadata.height);
    
    let min_semitones = frequency_to_fractional_midi_pitch (metadata.dimensions.min_frequency);
    let max_semitones = Math.ceil(frequency_to_fractional_midi_pitch (metadata.dimensions.max_frequency));
    for (let semitones = Math.floor (min_semitones); semitones <= max_semitones; ++semitones) {
      let color = semitones_to_note_info (semitones).color;
      //console.log (color, semitones) ;
      context.fillStyle = "#fff";
      if (color == "black") {
        context.fillStyle = "#ddd";
      }
      let freq_top = frequency_position (metadata.dimensions, midi_pitch_to_frequency(semitones+0.5)).canvas_y_downwards;
      context.fillRect(0, freq_top, metadata.dimensions.canvas_width, metadata.dimensions.pixels_per_semitone);
      context.fillStyle = "#000";
      context.fillText(`${semitones} (${semitones_to_note_name(semitones)})`, 2, freq_top + metadata.dimensions.pixels_per_semitone);
    }
    
    let step = metadata.grid_step_size();
    for (let time = Math.ceil(metadata.min_time/step)*step; time <metadata.max_time; time += step) {
      context.fillStyle = "#ccc";
      context.fillRect(time_position(metadata.dimensions, time), 0, 1, metadata.height);
    }
    
    context.fillStyle = "#000";
    //context.lineWidth = 4;
    context.strokeStyle = "#00f";
    
    metadata.iterate_notes(function(note, index, phrase, name) {
      if (project.saved_ui.viewed_phrases[name] === false && project.saved_ui.edited_phrase !== name) {return;}
      let dragged = drag_move && drag_move.dragged_notes [index];
      if (dragged) {
        draw_note (index, dragged_note (note), name);
      }
      if (!(dragged && !drag_move.event.shiftKey)) {
        draw_note (index, note, name);
      }
    });
    
    if (category == "generated") {
      context.fillStyle = "#f00";
      //context.fillRect((playback_position - metadata.min_time)*metadata.dimensions.pixels_per_second, 0, 1, metadata.dimensions.canvas_height);
      context.fillRect((project.playback_start    - metadata.dimensions.min_time)*metadata.dimensions.pixels_per_second, 0, 1, metadata.dimensions.canvas_height);
      context.fillRect((project.playback_end      - metadata.dimensions.min_time)*metadata.dimensions.pixels_per_second, 0, 1, metadata.dimensions.canvas_height);
    }
    
    if (drag_select !== null) {
      context.strokeStyle = "#f00";
      context.strokeRect (
        drag_select.original_coordinates.canvas_x,
        drag_select.original_coordinates.canvas_y_downwards,
        drag_select.current_coordinates.canvas_x - drag_select.original_coordinates.canvas_x,
        drag_select.current_coordinates.canvas_y_downwards - drag_select.original_coordinates.canvas_y_downwards);
    }
  };
  
  if (category == "generated") {
  let dragging_mouse_original_time = null;
  let dragging_start;
  let dragging_original_start;
  let dragging_original_end;
  
  canvas.addEventListener ("mousedown", function (event) {
    let coordinates = mouse_coordinates (event);
    dragging_mouse_original_time = coordinates.time;
    dragging_start = Math.abs(coordinates.time - playback_start) < Math.abs(coordinates.time - playback_end);
    dragging_original_start = playback_start;
    dragging_original_end = playback_end;
  });
  document.addEventListener ("mousemove", function (event) {
    let coordinates = mouse_coordinates (event);
    if (dragging_mouse_original_time !== null) {
      //console.log(coordinates);
      if (!coordinates.on_canvas_horizontally) {
        playback_start = dragging_original_start;
        playback_end = dragging_original_end;
      }
      else if (dragging_start) {
        playback_start = coordinates.time;
        playback_end = Math.max(dragging_original_end, playback_start + 0.1);
      } else {
        playback_end = coordinates.time;
        playback_start = Math.min(dragging_original_start, playback_end - 0.1);
      }
    }
  });
  document.addEventListener ("mouseup", function (event) {
    dragging_mouse_original_time = null;
    /* TODO push_input ({
      "SetPlaybackRange": [playback_start, playback_end],
    });*/
  });
  }
  
  if (category == "editable") {
    
    let this_phrase_tags = {}
    let for_selected = function (callback) {
      _.forOwn (edited_phrase().saved_ui.selected_notes, function(index) {
        callback (phrase.data.notes [index]);
      });
    };
    
    function add_tag_chooser (tag) {
      if (!this_phrase_tags[tag]) {
        let info = discover_tag (tag);
        let checkbox;
        tags_box.append($("<div>").append(
          checkbox = $("<input>", {type:"checkbox"}).on("change", e=>{
            if (edited_phrase() === undefined) {return;}
            for_selected(note=>{
              note.tags = note.tags.filter (tagg => tagg != tag);
              if (checkbox.prop('checked')) {
                note.tags.push(tag);
              }
            });
            changed();
          }), ` ${tag}`
        ));
        this_phrase_tags[tag] = {checkbox};
      }
    }
        
    let update_selected_tags = function() {
      _.forOwn (this_phrase_tags, info => {
        info.checkbox.prop('checked', false);
      });
      for_selected (note => {
        note.tags.forEach(function(tag) {
          this_phrase_tags[tag].checkbox.prop('checked', true);
        });
      });
    }
    
    let update_tags = function() {
      metadata.iterate_notes(function(note) {
        note.tags.forEach(add_tag_chooser);
      });
      if (edited_phrase() === undefined) {return;}
      update_selected_tags();
    };

    
    let new_tag_textbox;
    tags_box.append("New tag: ",
      new_tag_textbox = $("<input>", {type:"text"}),
      $("<input>", {type:"button"}).click (e=>{
        add_tag_chooser (new_tag_textbox.val())
      }),
    );
    
    update_tags();
    
    
    let changed = function() {
      save_phrase("editable", project.edited_phrase);
      update_tags();
      metadata.update_dimensions();
      metadata.redraw();
    };
    
    
    let modify_selection = function (notes, event) {
      //console.log(notes);
      if (!event.shiftKey && !event.ctrlKey) {
        edited_phrase().saved_ui.selected_notes = {};
      }
      if (event.ctrlKey) {
        notes.forEach(function(note, index) {
          delete edited_phrase().saved_ui.selected_notes[index];
        });
      }
      else {
        notes.forEach(function(note, index) {
          edited_phrase().saved_ui.selected_notes[index] = true;
        });
      }
      update_selected_tags();
      save_phrase_ui("editable", project.edited_phrase);
    }
    
    let create_note = function (note) {
      metadata.edited_phrase.data.notes.push (note);
    }
    
    canvas.addEventListener ("mousedown", function (event) {
      if (edited_phrase() === undefined) {return;}
      if (drag_move || drag_select) {return;}
      let coordinates = mouse_coordinates (event);
      let overlapping = get_overlapping_note (coordinates);
      if (overlapping === null) {
        drag_select = {event: event, original_coordinates: coordinates, current_coordinates: coordinates, maybe_click: true};
      }
      else {
        drag_move = {event: event, original_coordinates: coordinates, current_coordinates: coordinates, maybe_click: true, reference_note: overlapping};
        if (edited_phrase().saved_ui.selected_notes [overlapping.index]) {
          drag_move.dragged_notes = edited_phrase().saved_ui.selected_notes;
        }
        else {
          drag_move.dragged_notes = {[overlapping.index]: true};
        }
        if (coordinates.time > (overlapping.start*1/4 + overlapping.end*3/4)) {
          drag_move.ends_only = true;
        }
      }
    });
    
    document.addEventListener ("mousemove", function (event) {
      if (edited_phrase() === undefined) {return;}
      let coordinates = mouse_coordinates (event);
      let drag = (drag_select || drag_move);
      if (drag) {
        drag.current_coordinates = coordinates;
        if (Math.max(Math.abs (drag.current_coordinates.canvas_x - drag.original_coordinates.canvas_x), Math.abs (drag.current_coordinates.canvas_y_downwards - drag.original_coordinates.canvas_y_downwards)) > 2) {
          drag.maybe_click = false;
        }
      }
    });
    
    document.addEventListener ("mouseup", function (event) {
      if (edited_phrase() === undefined) {return;}
      let coordinates = mouse_coordinates (event);
      let drag = (drag_select || drag_move);
      
      if (drag && drag.maybe_click) {
        let overlapping = get_overlapping_note (coordinates);
        //console.log (coordinates, overlapping ) ;
        if (overlapping === null && event.shiftKey) {
          let note = {
            start: metadata.snap_time_to_grid(coordinates.time),
            end: metadata.snap_time_to_grid(coordinates.time) +1,
            frequency: metadata.snap_frequency_to_semitones (coordinates.frequency),
            tags: [],
            
          };
          create_note(note);
          changed();
        }
        else if (overlapping !== null) {
          modify_selection ([overlapping], event);
        }
        else {
          modify_selection ([], event);
        }
      }
      else if (drag_move) {
        if (coordinates.on_canvas) {
          if (drag_move.event.shiftKey) {
            let old_length = phrase.data.notes.length;
            iterate_keys(drag_move.dragged_notes, index => {
              let note = phrase.data.notes [index];
              create_note(copy_note(dragged_note (note)));
            });
            if (drag_move.dragged_notes === edited_phrase().saved_ui.selected_notes) {
              edited_phrase().saved_ui.selected_notes = {}
              for (let i = old_length; i < phrase.data.notes.length; ++i) {
                edited_phrase().saved_ui.selected_notes[i] = true;
              }
              save_phrase_ui("editable", project.edited_phrase);
            }
          } else {
            iterate_keys(drag_move.dragged_notes, index => {
              let note = phrase.data.notes [index];
              phrase.data.notes [index] = dragged_note (note);
            });
          }

          changed();
        }
      }
      else if (drag_select) {
        let notes = get_overlapping_notes (
          drag_select.original_coordinates.canvas_x,
          drag_select.original_coordinates.canvas_y_downwards,
          drag_select.current_coordinates.canvas_x,
          drag_select.current_coordinates.canvas_y_downwards);
        
        modify_selection (notes, drag_select.event);
      }
      drag_move = null;
      drag_select = null;
    });
    
    document.addEventListener ("keydown", function (event) {
      if (edited_phrase() === undefined) {return;}
      if (event.key == "ArrowLeft" || event.key == "ArrowRight" || event.key == "ArrowUp" || event.key == "ArrowDown") {
        for_selected (note => {
          if (event.key == "ArrowLeft") {
            let grid_shift = metadata.snap_time_to_grid(note.start - metadata.grid_step_size()) - note.start;
            note.start += grid_shift; note.end += grid_shift;
          }
          if (event.key == "ArrowRight") {
            let grid_shift = metadata.snap_time_to_grid(note.start + metadata.grid_step_size()) - note.start;
            note.start += grid_shift; note.end += grid_shift;
          }
          if (event.key == "ArrowUp") {
            note.frequency = metadata.snap_frequency_to_semitones (note.frequency * semitone_ratio);
          }
          if (event.key == "ArrowDown") {
            note.frequency = metadata.snap_frequency_to_semitones (note.frequency / semitone_ratio);
          }
        });
        changed();
      }
      
      if (event.key === "Delete" || event.key === "Backspace") {
        phrase.data.notes = phrase.data.notes.filter ((note, index) => !edited_phrase().saved_ui.selected_notes [index]);
        edited_phrase().saved_ui.selected_notes = {} ;
        changed();
      }
    });
    
    //if (did_load) {setImmediate(()=>changed());}
  }
  
  //redraw();
  
  return metadata;
}


