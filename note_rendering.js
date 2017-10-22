
window.phrases_dimensions = function (phrases) {
    const metadata = {};
    
    metadata.min_time = 0.0;
    metadata.max_time = 4.0;
    metadata.min_frequency = 130.0;
    metadata.max_frequency = 880.0;
    
    phrases.forEach(function(phrase) {
      window.contribute_phrase_dimensions (phrase, metadata);
    });
    
    metadata.canvas_width = metadata.time_width*time_scale;
    metadata.canvas_height = metadata.height_in_semitones*semitone_scale;
    
    metadata.pixels_per_second = metadata.canvas_width / metadata.width_in_seconds;
    metadata.pixels_per_semitone = metadata.canvas_height / metadata.height_in_log_frequency;
    metadata.pixels_per_log_frequency = metadata.canvas_height / metadata.height_in_semitones;
    
    return metadata;
}


window.contribute_phrase_dimensions = function (phrase, metadata) {
    phrase.data.notes.forEach(function(note, index) {
      metadata.min_time = Math.min (metadata.min_time, note.start - 1);
      metadata.max_time = Math.max (metadata.max_time, note.end + 1);
      metadata.min_frequency = Math.min (metadata.min_frequency, note.frequency*Math.pow(semitone_ratio, -12.5));
      metadata.max_frequency = Math.max (metadata.max_frequency, note.frequency*Math.pow(semitone_ratio, 12.5));
    });
    
    metadata.width_in_seconds = metadata.max_time - metadata.min_time;
    metadata.log_min_frequency = Math.log (metadata.min_frequency);
    metadata.log_max_frequency = Math.log (metadata.max_frequency);
    metadata.height_in_log_frequency = metadata.log_max_frequency - metadata.log_min_frequency;
    metadata.height_in_semitones = metadata.height_in_log_frequency/log_semitone_ratio;   
}

window.get_coordinates = function (canvas_x, canvas_y_downwards) {
    let result = {};
    result.canvas_x = canvas_x;
    result.time = result.canvas_x/time_scale + metadata.min_time;
    result.canvas_y_downwards = canvas_y_downwards;
    result.canvas_y_upwards = metadata.height - result.canvas_y_downwards;
    result.frequency = Math.exp(result.canvas_y_upwards/log_frequency_scale + metadata.log_min_frequency);
    result.on_canvas_horizontally = (result.time >= metadata.min_time && result.time <= metadata.max_time);
    result.on_canvas_vertically = (result.canvas_y_downwards >= 0 && result.canvas_y_downwards <= metadata.height);
    result.on_canvas = result.on_canvas_horizontally && result.on_canvas_vertically;
    return result;
  };


window.frequency_position = function (dimensions, frequency, target) {
    let result = target || {};
    result.log_frequency = Math.log (frequency);
    result.canvas_y_downwards = (dimensions.log_max_frequency - result.log_frequency) * dimensions.pixels_per_log_frequency;
    return result;
  };
  
window.time_position = function (dimensions, time) {
    return (time - dimensions.min_time) * dimensions.pixels_per_second;
  };
  
window.note_coordinates = function (note, target) {
    let result = target || {};
    result.canvas_min_x = time_position(note.start);
    result.canvas_max_x = time_position(note.end);
    result.canvas_width = result.canvas_max_x - result.canvas_min_x;
    result.log_frequency = Math.log (note.frequency);
    let midh = metadata.log_max_frequency - result.log_frequency;
    result.canvas_min_y_downwards = metadata.height * ((midh - log_semitone_ratio/2) / metadata.log_frequency_ratio);
    result.canvas_max_y_downwards = metadata.height * ((midh + log_semitone_ratio/2) / metadata.log_frequency_ratio);
    result.canvas_height = result.canvas_max_y_downwards - result.canvas_min_y_downwards;
    result.min_displayed_frequency = note.frequency/sqrt_semitone_ratio;
    result.max_displayed_frequency = note.frequency*sqrt_semitone_ratio;
    return result;
  }
  




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
    
    result.coordinates = note_coordinates (result);
    return result;
  };
  
  let draw_note = function(note) {
    let coordinates = note.coordinates;
    
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
    context.fillRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    if (selected_notes [note.index]) {
      context.strokeRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    }
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


  
  



  let mouse_coordinates = function (event) {
    return get_coordinates(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
  };
  
  let get_overlapping_note = function (coordinates) {
    return phrase.data.notes.find(function(note) {
      if ( note.coordinates.canvas_min_x < coordinates.canvas_x
        && note.coordinates.canvas_max_x > coordinates.canvas_x
        && note.coordinates.canvas_min_y_downwards < coordinates.canvas_y_downwards
        && note.coordinates.canvas_max_y_downwards > coordinates.canvas_y_downwards) {
        return true;
      }
    }) || null;
  };
  let get_overlapping_notes = function (x1,y1,x2,y2) {
    return phrase.data.notes.filter(function(note) {
      //console.log (x1,y1,x2,y2, note) ;
      /*console.log (
        note.coordinates.canvas_min_x < x1,
        note.coordinates.canvas_min_x < x2,
        note.coordinates.canvas_max_x > x1,
        note.coordinates.canvas_max_x > x2,
        note.coordinates.canvas_min_y_downwards < y1,
        note.coordinates.canvas_min_y_downwards < y2,
        note.coordinates.canvas_max_y_downwards > y1,
        note.coordinates.canvas_max_y_downwards > y2) ;*/
      if ( (note.coordinates.canvas_min_x < x1 ||
            note.coordinates.canvas_min_x < x2)
        && (note.coordinates.canvas_max_x > x1 ||
            note.coordinates.canvas_max_x > x2)
        && (note.coordinates.canvas_min_y_downwards < y1 ||
            note.coordinates.canvas_min_y_downwards < y2)
        && (note.coordinates.canvas_max_y_downwards > y1 ||
            note.coordinates.canvas_max_y_downwards > y2)
        ) {
        //console.log (x1,y1,x2,y2, note) ;
        return true;
      }
      return false;
    });
  };
  
  let drag_select = null;
  let drag_move = null;
  let selected_notes = {};
  
  let redraw = metadata.redraw = function() {
    context.fillStyle = "#eee";
    //context.fillRect(0,0,metadata.width,metadata.height);
    
    let min_semitones = frequency_to_fractional_midi_pitch (metadata.min_frequency);
    let max_semitones = Math.ceil(frequency_to_fractional_midi_pitch (metadata.max_frequency));
    for (let semitones = Math.floor (min_semitones); semitones <= max_semitones; ++semitones) {
      let color = semitones_to_note_info (semitones).color;
      //console.log (color, semitones) ;
      context.fillStyle = "#fff";
      if (color == "black") {
        context.fillStyle = "#ddd";
      }
      let freq_top = frequency_position (midi_pitch_to_frequency(semitones+0.5)).canvas_y_downwards;
      context.fillRect(0, freq_top, metadata.width, semitone_scale);
      context.fillStyle = "#000";
      context.fillText(`${semitones} (${semitones_to_note_name(semitones)})`, 2, freq_top + semitone_scale);
    }
    
    let step = metadata.grid_step_size();
    for (let time = Math.ceil(metadata.min_time/step)*step; time <metadata.max_time; time += step) {
      context.fillStyle = "#ccc";
      context.fillRect(time_position(time), 0, 1, metadata.height);
    }
    
    context.fillStyle = "#000";
    //context.lineWidth = 4;
    context.strokeStyle = "#00f";
    
    phrase.data.notes.forEach(function(note) {
      let dragged = drag_move && drag_move.dragged_notes [note.index];
      if (dragged) {
        draw_note (dragged_note (note));
      }
      if (!(dragged && !drag_move.event.shiftKey)) {
        draw_note (note);
      }
    });
    
    if (phrase.timed_with_playback) {
      context.fillStyle = "#f00";
      context.fillRect((playback_position - metadata.min_time)*time_scale, 0, 1, metadata.height);
      context.fillRect((playback_start    - metadata.min_time)*time_scale, 0, 1, metadata.height);
      context.fillRect((playback_end      - metadata.min_time)*time_scale, 0, 1, metadata.height);
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
  
  if (phrase.timed_with_playback && !phrase.editable) {
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
    push_input ({
      "SetPlaybackRange": [playback_start, playback_end],
    });
  });
  }
  
  if (phrase.editable) {
    let this_phrase_tags = {}
    let for_selected = function (callback) {
      iterate_keys (selected_notes, function(index) {
        callback (phrase.data.notes [index]);
      });
    };
    
    function add_tag_chooser (tag) {
      if (!this_phrase_tags[tag]) {
        let info = discover_tag (tag);
        let checkbox;
        tags_box.append($("<div>").append(
          checkbox = $("<input>", {type:"checkbox"}).on("change", e=>{
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
      iterate_values (this_phrase_tags, info => {
        info.checkbox.prop('checked', false);
      });
      for_selected (note => {
        note.tags.forEach(function(tag) {
          this_phrase_tags[tag].checkbox.prop('checked', true);
        });
      });
    }
    
    let update_tags = function() {
      phrase.data.notes.forEach(function(note) {
        note.tags.forEach(add_tag_chooser);
      });
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
      
      push_input ({
        "EditPhrase": [phrase_index, phrase.data],
      });
      update_tags();
      metadata.update_dimensions();
      metadata.redraw();
      try {
        console.log(path)
        filesystem.writeFileSync (path, JSON.stringify(phrase.data));
      } catch(e){console.log(e)}
    };
    
    
    let modify_selection = function (notes, event) {
      //console.log(notes);
      if (!event.shiftKey && !event.ctrlKey) {
        selected_notes = {};
      }
      if (event.ctrlKey) {
        notes.forEach(function(note) {
          delete selected_notes[note.index];
        });
      }
      else {
        notes.forEach(function(note) {
          selected_notes[note.index] = true;
        });
      }
      update_selected_tags();
    }
    
    let create_note = function (note) {
      note.index = phrase.data.notes.length;
      note.coordinates = note_coordinates(note);
      phrase.data.notes.push (note);
    }
    
    canvas.addEventListener ("mousedown", function (event) {
      if (drag_move || drag_select) {return;}
      let coordinates = mouse_coordinates (event);
      let overlapping = get_overlapping_note (coordinates);
      if (overlapping === null) {
        drag_select = {event: event, original_coordinates: coordinates, current_coordinates: coordinates, maybe_click: true};
      }
      else {
        drag_move = {event: event, original_coordinates: coordinates, current_coordinates: coordinates, maybe_click: true, reference_note: overlapping};
        if (selected_notes [overlapping.index]) {
          drag_move.dragged_notes = selected_notes;
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
            if (drag_move.dragged_notes === selected_notes) {
              selected_notes = {}
              for (let i = old_length; i < phrase.data.notes.length; ++i) {
                selected_notes[i] = true;
              }
            }
          } else {
            iterate_keys(drag_move.dragged_notes, index => {
              let note = phrase.data.notes [index];
              phrase.data.notes [note.index] = dragged_note (note);
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
        phrase.data.notes = phrase.data.notes.filter (note => !selected_notes [note.index]);
        selected_notes = {} ;
        changed();
      }
    });
    
    if (did_load) {setImmediate(()=>changed());}
  }
  
  //redraw();
  
  return metadata;
}

function update() {
  let updates = JSON.parse(songs.poll_updates());
  let phrases_element = document.getElementById ("phrases");
  updates.forEach(function(update) {
    if (update.ReplacePhrase) {
      //console.log (update);
      let index = update.ReplacePhrase [0];
      let phrase = update.ReplacePhrase[1];

      if (phrases_metadata[index]) {
        let element = phrases_metadata[index].element;
        element.parentNode.removeChild (element);
        delete phrases_metadata[index];
      }
      if (phrase !== null) {
        let drawn = draw_phrase (phrase, index);
        phrases_element.appendChild (drawn.element);
        phrases_metadata[index] = drawn;
      }
      
      console.log(phrases_metadata);
    }
    if (update.UpdatePlaybackPosition) {
      playback_position = update.UpdatePlaybackPosition;
    }
  });
  
  iterate_values (phrases_metadata, function(metadata) {
    metadata.redraw();
  });
}

setInterval (update, 100);
