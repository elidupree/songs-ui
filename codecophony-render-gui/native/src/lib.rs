#[macro_use]
extern crate neon;

extern crate songs;

use neon::vm::{Call, JsResult};
use neon::js::{JsString, JsUndefined, Value};

fn push_gui_input(call: Call) -> JsResult<JsUndefined> {
    let scope = call.scope;
    songs::push_gui_input(call.arguments.require(scope, 0)?.to_string(scope)?.value());
    Ok(JsUndefined::new())
}

fn poll_updates(call: Call) -> JsResult<JsString> {
    let scope = call.scope;
    JsString::new_or_throw(scope, &songs::poll_updates())
}

register_module!(m, {
    m.export("push_gui_input", push_gui_input)?;
    m.export("poll_updates", poll_updates)?;
    Ok(())
});
