#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
ROOT_URL="${BASE_URL%/}"
API_URL="${BASE_URL%/}/api/items"
TMP_DIR="$(mktemp -d)"
declare -a CREATED_IDS=()
RUN_ID="$(date +%s)"
ITEM_PREFIX="smoke-item-${RUN_ID}"
UPDATED_NAME="updated-${ITEM_PREFIX}"

cleanup() {
  if curl -sS -o /dev/null "${API_URL}" 2>/dev/null; then
    for item_id in "${CREATED_IDS[@]}"; do
      curl -sS -o /dev/null -X DELETE "${API_URL}/${item_id}" || true
    done
  fi

  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

print_body() {
  local file_path="$1"

  if [[ -s "${file_path}" ]]; then
    cat "${file_path}"
    printf '\n'
  fi
}

assert_contains() {
  local file_path="$1"
  local expected_text="$2"

  if ! grep -Fq "${expected_text}" "${file_path}"; then
    printf 'Expected response to contain: %s\n' "${expected_text}" >&2
    print_body "${file_path}" >&2
    exit 1
  fi
}

request() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local output_file="$5"
  local body="${6:-}"
  local actual_status

  printf '\n== %s ==\n' "${label}"

  if [[ -n "${body}" ]]; then
    actual_status="$(
      curl -sS -o "${output_file}" -w '%{http_code}' \
        -X "${method}" "${url}" \
        -H 'Content-Type: application/json' \
        -d "${body}"
    )"
  else
    actual_status="$(
      curl -sS -o "${output_file}" -w '%{http_code}' \
        -X "${method}" "${url}"
    )"
  fi

  printf 'Status: %s\n' "${actual_status}"
  print_body "${output_file}"

  if [[ "${actual_status}" != "${expected_status}" ]]; then
    printf 'Expected status %s but received %s\n' "${expected_status}" "${actual_status}" >&2
    exit 1
  fi
}

printf 'Using API base URL: %s\n' "${API_URL}"

if ! curl -sS -o /dev/null "${API_URL}"; then
  printf 'Could not reach %s\n' "${API_URL}" >&2
  printf 'Start the server first with: npm run dev\n' >&2
  exit 1
fi

for item_number in 1 2 3 4 5 6; do
  item_name="${ITEM_PREFIX}-${item_number}"
  item_price=$((100 + item_number))

  request \
    "Create item ${item_number}" \
    "POST" \
    "${API_URL}" \
    "201" \
    "${TMP_DIR}/create-${item_number}.json" \
    "{\"name\":\"${item_name}\",\"description\":\"MacBook Pro ${item_number}\",\"price\":${item_price}}"

  item_id="$(
    node -e "const fs = require('fs'); const item = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (!item.id) process.exit(1); process.stdout.write(String(item.id));" \
      "${TMP_DIR}/create-${item_number}.json"
  )"

  CREATED_IDS+=("${item_id}")
  assert_contains "${TMP_DIR}/create-${item_number}.json" "\"name\":\"${item_name}\""
done

request \
  "List items with default pagination" \
  "GET" \
  "${API_URL}?name=${ITEM_PREFIX}" \
  "200" \
  "${TMP_DIR}/list.json"

assert_contains "${TMP_DIR}/list.json" "\"items\":["
assert_contains "${TMP_DIR}/list.json" "\"pagination\":{"
assert_contains "${TMP_DIR}/list.json" "\"page\":1"
assert_contains "${TMP_DIR}/list.json" "\"limit\":10"
assert_contains "${TMP_DIR}/list.json" "\"totalItems\":6"
assert_contains "${TMP_DIR}/list.json" "\"totalPages\":1"
assert_contains "${TMP_DIR}/list.json" "\"hasNextPage\":false"
assert_contains "${TMP_DIR}/list.json" "\"hasPreviousPage\":false"
assert_contains "${TMP_DIR}/list.json" "\"name\":\"${ITEM_PREFIX}-1\""

request \
  "List items with filters and pagination metadata" \
  "GET" \
  "${API_URL}?name=${ITEM_PREFIX}&min_price=103&max_price=106&sort=price&order=asc&page=1&limit=2" \
  "200" \
  "${TMP_DIR}/filtered.json"

assert_contains "${TMP_DIR}/filtered.json" "\"totalItems\":4"
assert_contains "${TMP_DIR}/filtered.json" "\"totalPages\":2"
assert_contains "${TMP_DIR}/filtered.json" "\"hasNextPage\":true"
assert_contains "${TMP_DIR}/filtered.json" "\"hasPreviousPage\":false"
assert_contains "${TMP_DIR}/filtered.json" "\"price\":103"
assert_contains "${TMP_DIR}/filtered.json" "\"price\":104"

request \
  "List items on page 2" \
  "GET" \
  "${API_URL}?name=${ITEM_PREFIX}&sort=price&order=asc&page=2&limit=5" \
  "200" \
  "${TMP_DIR}/page-2.json"

assert_contains "${TMP_DIR}/page-2.json" "\"page\":2"
assert_contains "${TMP_DIR}/page-2.json" "\"limit\":5"
assert_contains "${TMP_DIR}/page-2.json" "\"totalItems\":6"
assert_contains "${TMP_DIR}/page-2.json" "\"totalPages\":2"
assert_contains "${TMP_DIR}/page-2.json" "\"hasNextPage\":false"
assert_contains "${TMP_DIR}/page-2.json" "\"hasPreviousPage\":true"
assert_contains "${TMP_DIR}/page-2.json" "\"price\":106"

request \
  "Get one item" \
  "GET" \
  "${API_URL}/${CREATED_IDS[0]}" \
  "200" \
  "${TMP_DIR}/get.json"

assert_contains "${TMP_DIR}/get.json" "\"id\":${CREATED_IDS[0]}"

request \
  "Update item" \
  "PUT" \
  "${API_URL}/${CREATED_IDS[0]}" \
  "200" \
  "${TMP_DIR}/update.json" \
  "{\"name\":\"${UPDATED_NAME}\",\"price\":1799.99}"

assert_contains "${TMP_DIR}/update.json" "\"name\":\"${UPDATED_NAME}\""
assert_contains "${TMP_DIR}/update.json" "\"price\":1799.99"

request \
  "Delete item" \
  "DELETE" \
  "${API_URL}/${CREATED_IDS[0]}" \
  "204" \
  "${TMP_DIR}/delete.txt"

request \
  "Get deleted item" \
  "GET" \
  "${API_URL}/${CREATED_IDS[0]}" \
  "404" \
  "${TMP_DIR}/missing.json"

assert_contains "${TMP_DIR}/missing.json" "Item not found"

request \
  "Invalid page" \
  "GET" \
  "${API_URL}?page=0" \
  "400" \
  "${TMP_DIR}/invalid-page.json"

assert_contains "${TMP_DIR}/invalid-page.json" "page must be a positive integer"

request \
  "Invalid limit" \
  "GET" \
  "${API_URL}?limit=0" \
  "400" \
  "${TMP_DIR}/invalid-limit.json"

assert_contains "${TMP_DIR}/invalid-limit.json" "limit must be an integer between 1 and 100"

request \
  "Create invalid item" \
  "POST" \
  "${API_URL}" \
  "400" \
  "${TMP_DIR}/invalid.json" \
  "{\"description\":\"Missing name\",\"price\":10}"

assert_contains "${TMP_DIR}/invalid.json" "Name is required"

request \
  "Unknown route" \
  "GET" \
  "${ROOT_URL}/api/unknown-route" \
  "404" \
  "${TMP_DIR}/unknown-route.json"

assert_contains "${TMP_DIR}/unknown-route.json" "Route not found"

printf '\nAll API checks passed.\n'
