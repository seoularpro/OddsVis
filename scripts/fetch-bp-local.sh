#!/usr/bin/env bash
#
# Generate a BettingPros data file locally — identical output to the
# `Fetch JSON` step in .github/workflows/BettingProFetch.yml — so you can
# preview it in the dev server before committing any changes.
#
#   ./scripts/fetch-bp-local.sh [week] [index]
#   BP_API_KEY=<key> ./scripts/fetch-bp-local.sh 1 0
#
# Writes to  odds-react-app/public/BettingProsFiles/<year>week<week><index>
# which the CRA dev server serves at  /BettingProsFiles/...
# Point the app at it by setting REACT_APP_BP_BASE=/BettingProsFiles/
# (see odds-react-app/.env.local) and restarting `npm start`.
#
set -euo pipefail

week="${1:-1}"
index="${2:-0}"
year="2026"
api_key="${BP_API_KEY:-CHi8Hy5CEE4khd46XNYL23dCFX96oUdw6qOt1Dnh}"
event_ids="21920:21906:21924:21926:21922:21921:21925:22120:21927:21923:21928:21930:21931:21929:21907:21910"

props_markets="73:74:102:103:100:333:101:106:107:76:105:75:104:66:71:78:253"
offers_markets="78:101:102:103:104:105:107"

root="$(cd "$(dirname "$0")/.." && pwd)"
outdir="${root}/odds-react-app/public/BettingProsFiles"
mkdir -p "${outdir}"
out="${outdir}/${year}week${week}${index}"

tmp="$(mktemp)"
offers_tmp="$(mktemp)"
trap 'rm -f "${tmp}" "${offers_tmp}"' EXIT

echo "Fetching /props (markets: ${props_markets}) ..."
base="https://api.bettingpros.com/v3/props?limit=200&sport=NFL&market_id=${props_markets}&event_id=${event_ids}&ev_threshold=false&include_selections=false&include_markets=true&include_counts=true"
p1=$(curl -s -H "x-api-key: ${api_key}" "${base}&page=1")
tp=$(echo "${p1}" | jq -r '._pagination.total_pages // 1')
echo "${p1}" | jq -c '.props[]' > "${tmp}"
for p in $(seq 2 "${tp}"); do
  curl -s -H "x-api-key: ${api_key}" "${base}&page=${p}" | jq -c '.props[]' >> "${tmp}"
done

echo "Fetching /offers (markets: ${offers_markets}, 10/page) ..."
obase="https://api.bettingpros.com/v3/offers?sport=NFL&market_id=${offers_markets}&event_id=${event_ids}&limit=10"
distill='.offers[] |
  if .market_id == 78 then
    .selections[] | . as $s | ($s.books[]|select(.id==0)|.lines[0]) as $l | select($l!=null)
      | {market_id:78, name:$s.label, position:null, odds:$l.cost, line:$l.line}
  else
    . as $o | ($o.selections[]|select(.selection=="over")) as $s | ($s.books[]|select(.id==0)|.lines[0]) as $l
      | select($l!=null and (($o.participants|length)>0))
      | {market_id:$o.market_id, name:$o.participants[0].name, position:$o.participants[0].player.position, odds:$l.cost, line:$l.line}
  end'
op1=$(curl -s -H "x-api-key: ${api_key}" "${obase}&page=1")
op=$(echo "${op1}" | jq -r '._pagination.total_pages // 1')
echo "${op1}" | jq -c "${distill}" > "${offers_tmp}"
for p in $(seq 2 "${op}"); do
  curl -s -H "x-api-key: ${api_key}" "${obase}&page=${p}" | jq -c "${distill}" >> "${offers_tmp}"
done

jq -n \
  --slurpfile props "${tmp}" \
  --slurpfile offers "${offers_tmp}" \
  '{props: $props, offers: $offers}' > "${out}"

echo
echo "Wrote $(jq '.props|length' "${out}") props + $(jq '.offers|length' "${out}") offers"
echo "  file:   ${out}"
echo "  served: http://localhost:3000/BettingProsFiles/${year}week${week}${index}"
echo
echo "Next: ensure odds-react-app/.env.local has REACT_APP_BP_BASE=/BettingProsFiles/"
echo "      then (re)start the dev server so the app reads this file."
