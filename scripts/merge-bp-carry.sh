#!/usr/bin/env bash
#
# Fold one BettingPros snapshot into the week's "carry" file.
#
#   ./scripts/merge-bp-carry.sh <snapshot-file> <carry-file> <snapshot-index>
#
# The carry file has the same {props, offers} shape as a snapshot, but holds
# the union of every (market, player) prop seen so far this week, each at the
# value from the most recent snapshot that listed it. A prop that disappears
# from later snapshots stays in the carry at its last posted value, so the app
# can keep a player who was complete mid-week and flag him once the latest
# snapshot no longer has all his props. Each entry carries `carry_index`, the
# index of the snapshot it was last seen in.
#
# Used by .github/workflows/BettingProFetch.yml and scripts/fetch-bp-local.sh.
#
set -euo pipefail

snapshot="$1"
carry="$2"
index="$3"

if [ -f "${carry}" ]; then
  prev="${carry}"
else
  prev="/dev/null"
fi

tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

jq -n \
  --slurpfile prev "${prev}" \
  --slurpfile new "${snapshot}" \
  --argjson idx "${index}" '
  def key: (.market_id | tostring) + "|" + (.participant.name // .name // "");
  # Later entries win, so the new snapshot overrides the previous carry.
  def merge($old; $add):
    reduce (($old // []) + (($add // []) | map(. + {carry_index: $idx})))[] as $x
      ({}; .[$x | key] = $x)
    | [.[]];
  ($prev[0] // {}) as $p
  | ($new[0]) as $n
  | {
      last_index: $idx,
      props: merge($p.props; $n.props),
      offers: merge($p.offers; $n.offers)
    }' > "${tmp}"

mv "${tmp}" "${carry}"
echo "Carry ${carry}: $(jq '.props | length' "${carry}") props + $(jq '.offers | length' "${carry}") offers (through snapshot ${index})"
