#[macro_use]
extern crate neon;

extern crate songs;

use neon::vm::{Call, JsResult};
use neon::js::{JsString, JsUndefined, Value};

fn set_playback_range(call: Call) -> JsResult<JsUndefined> {
    let scope = call.scope;
    songs::set_playback_range(call.arguments.require(scope, 0)?.to_string(scope)?.value());
    Ok(JsUndefined::new())
}

fn poll_rendered(call: Call) -> JsResult<JsString> {
    let scope = call.scope;
    JsString::new_or_throw(scope, &songs::poll_rendered())
}

register_module!(m, {
    m.export("set_playback_range", set_playback_range)?;
    m.export("poll_rendered", poll_rendered)?;
    Ok(())
});
