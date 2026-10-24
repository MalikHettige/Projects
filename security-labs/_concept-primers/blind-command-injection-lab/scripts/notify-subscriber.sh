#!/bin/bash
# Stand-in for a real subscriber-notification job (e.g. queuing a welcome
# email). Deliberately unremarkable — the vulnerability lives in how
# server.mjs invokes this script (unquoted, unsanitized interpolation into a
# shell command line), not in anything this script itself does.
echo "$(date -Is) notification queued for: $1" >> /tmp/feedback-notifications.log
