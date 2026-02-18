#!/usr/bin/env bash

# Required Environment Variables
#
# $SONAR_TOKEN:               access token for sonar server
# $SONAR_PROPERTIES_PATH:     path to the projects sonar properties file
# $CI_SERVER_URL:             default CI variable
# $CI_MERGE_REQUEST_IID       default CI variable
# $CI_PROJECT_ID              default CI variable
# $GITLAB_TOKEN               gitlab access token

SONAR_TOKEN="$SONAR_TO"
SONAR_PROPERTIES_PATH="sonar-project.properties"
CI_SERVER_URL="git.eon-cds.de"
CI_PROJECT_ID="34937"
CI_MERGE_REQUEST_IID="285"
RENOVATE_TOKEN="$GITLAB_TOKEN"

set -o errexit
set -o nounset
set -o pipefail

# Constants
readonly STATUS_FILE="quality_gate_status.json"
readonly DISCUSSIONS_FILE="discussions.json"
readonly ISSUES_FILE="sonar_issues.json"
readonly MEASURES_FILE="sonar_measures.json"
readonly MR_CHANGES_FILE="mr_changes.json"
readonly COLOR_RED='\e[0;31m'
readonly COLOR_GREEN='\e[0;32m'
readonly COLOR_YELLOW='\e[0;33m'
readonly COLOR_BLUE='\e[0;36m'
readonly COLOR_GRAY='\e[0;90m'
readonly COLOR_RESET='\e[0m'
readonly ICON_SUCCESS="🟢"
readonly ICON_FAILURE="🔴"
readonly ICON_NEUTRAL="⚪"
      
# Global variables
sonar_token="${SONAR_TOKEN}"
sonar_host=""
sonar_project_key=""
gl_url=""
gl_id="${CI_PROJECT_ID}"
gl_mr_iid="${CI_MERGE_REQUEST_IID}"
gl_token="${RENOVATE_TOKEN}"
quality_gate_status=""
summary_discussion_id=""
summary_note_id=""

# Utility functions
log() {
    local color="${1}"
    local message="${2}"
    printf "${color}%s${COLOR_RESET}\n" "${message}" >&2
}

log_info() { log "${COLOR_YELLOW}" "$1"; }
log_success() { log "${COLOR_GREEN}" "$1"; }
log_error() { log "${COLOR_RED}" "$1"; }
log_debug() { log "${COLOR_GRAY}" "$1"; }

get_property() {
    local key="${1}"
    local file="${2}"
    grep "^${key}=" "${file}" | cut -d'=' -f2
}

ensure_protocol() {
    local url="${1}"
    if [[ "${url}" =~ ^https?:// ]]; then
        echo "${url}"
    else
        echo "https://${url}"
    fi
}

get_status_icon() {
    local status="${1:-}"
    case "${status}" in
        OK) echo "${ICON_SUCCESS}" ;;
        ERROR) echo "${ICON_FAILURE}" ;;
        *) echo "${ICON_NEUTRAL}" ;;
    esac
}

fetch_data() {
    local url="${1}"
    local output_file="${2}"
    local auth_header="${3}"
    wget --header "${auth_header}" -O "${output_file}" "${url}" -q 2>/dev/null || true
}

resolve_discussion() {
    local discussion_id="${1}"
    local resolve_body
    resolve_body=$(jq -c -n '{resolved: true}')
    wget --header "PRIVATE-TOKEN: ${gl_token}" \
         --header "Content-Type: application/json" \
         --method PUT \
         --body-data "${resolve_body}" \
         "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/discussions/${discussion_id}" \
         -q -O /dev/null 2>/dev/null || true
}

init_config() {
    sonar_host=$(get_property "sonar.host.url" "${SONAR_PROPERTIES_PATH}")
    sonar_project_key=$(get_property "sonar.projectKey" "${SONAR_PROPERTIES_PATH}")
    gl_url=$(ensure_protocol "${CI_SERVER_URL}")
}

fetch_quality_gate_status() {
    log_info "Fetching quality gate status..."
    fetch_data "${sonar_host}/api/qualitygates/project_status?projectKey=${sonar_project_key}&pullRequest=${gl_mr_iid}" \
        "${STATUS_FILE}" "Authorization: Bearer ${sonar_token}"
    quality_gate_status=$(jq -r '.projectStatus.status' "${STATUS_FILE}")
}

fetch_discussions() {
    log_info "Fetching GitLab discussions..."
    fetch_data "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/discussions" \
        "${DISCUSSIONS_FILE}" "PRIVATE-TOKEN: ${gl_token}"
    read -r summary_discussion_id summary_note_id < <(
        jq -r 'first(.[] | select(.notes[0].body | contains("SonarQube Analysis Summary"))) | [.id, .notes[0].id] | join(" ")' \
        "${DISCUSSIONS_FILE}"
    ) || true
}

handle_quality_gate_pass() {
    log_success "Quality gate passed!"
    log_info "Fetching SonarQube metrics..."
    read -r coverage duplication < <(fetch_sonar_metrics)
    summary_body=$(generate_summary_comment "0" "${coverage}" "${duplication}")
    post_summary_discussion "${summary_body}"
    log_success "Resolving all SonarQube issue discussions..."
    jq -r '.[] | select(.notes[0].body | contains("SonarQube Issue:")) | .id' "${DISCUSSIONS_FILE}" | \
    while read -r sonar_discussion_id; do
        if [[ -n "${sonar_discussion_id}" ]]; then
            resolve_discussion "${sonar_discussion_id}"
        fi
    done
    fetch_discussions
    if [[ -n "${summary_discussion_id}" ]]; then
        log_success "Resolving SonarQube summary discussion..."
        resolve_discussion "${summary_discussion_id}"
    fi
}

fetch_sonar_metrics() {
    local coverage duplication
    fetch_data "${sonar_host}/api/measures/component?component=${sonar_project_key}&pullRequest=${gl_mr_iid}&metricKeys=new_coverage,new_duplicated_lines_density" \
        "${MEASURES_FILE}" "Authorization: Bearer ${sonar_token}"
    coverage=$(jq -r '.component.measures[] | select(.metric == "new_coverage") | .value // "N/A"' "${MEASURES_FILE}" 2>/dev/null || echo "N/A")
    duplication=$(jq -r '.component.measures[] | select(.metric == "new_duplicated_lines_density") | .value // "N/A"' "${MEASURES_FILE}" 2>/dev/null || echo "N/A")
    echo "${coverage} ${duplication}"
}

generate_summary_comment() {
    local issue_count="${1}"
    local coverage="${2}"
    local duplication="${3}"
    local status_text issues_icon coverage_icon duplication_icon coverage_display duplication_display
    local violations_status coverage_status duplication_status

    if [[ "${quality_gate_status}" == "OK" ]]; then
        status_text="PASSED"
    else
        status_text="FAILED"
    fi

    violations_status=$(jq -r '.projectStatus.conditions[] | select(.metricKey == "new_violations") | .status' "${STATUS_FILE}" 2>/dev/null || echo "")
    issues_icon=$(get_status_icon "${violations_status}")

    coverage_status=$(jq -r '.projectStatus.conditions[] | select(.metricKey == "new_coverage") | .status' "${STATUS_FILE}" 2>/dev/null || echo "")
    coverage_icon=$(get_status_icon "${coverage_status}")

    duplication_status=$(jq -r '.projectStatus.conditions[] | select(.metricKey == "new_duplicated_lines_density") | .status' "${STATUS_FILE}" 2>/dev/null || echo "")
    duplication_icon=$(get_status_icon "${duplication_status}")

    if [[ "${coverage}" != "N/A" ]]; then
        coverage_display="${coverage}%"
    else
        coverage_display="N/A"
    fi

    if [[ "${duplication}" != "N/A" ]]; then
        duplication_display="${duplication}%"
    else
        duplication_display="N/A"
    fi

    cat <<EOF
## SonarQube Analysis Summary

**Quality Gate:** ${status_text}

---

${issues_icon} **New Issues:** ${issue_count}

${coverage_icon} **Test Coverage (Changed Code):** ${coverage_display}

${duplication_icon} **Code Duplication (Changed Code):** ${duplication_display}

---

[View Full Analysis in SonarQube](${sonar_host}/dashboard?id=${sonar_project_key}&pullRequest=${gl_mr_iid})
EOF
}

extract_file_path() {
    local component="${1}"
    if [[ "${component}" =~ :src/ ]]; then
        echo "${component##*:}"
    else
        echo "${component}" | cut -d':' -f3-
    fi
}

check_existing_comment() {
    local file_path="${1}"
    local line="${2}"
    local rule="${3}"
    jq -r --arg file "${file_path}" --arg line "${line}" --arg rule "${rule}" \
        '.[] | select(.notes[0].body | contains("SonarQube Issue:") and contains($rule)) | 
         select(.notes[0].position.new_path == $file or .notes[0].position.old_path == $file) |
         select(.notes[0].position.new_line == ($line | tonumber) or .notes[0].position.old_line == ($line | tonumber)) | 
         .id' "${DISCUSSIONS_FILE}" | head -1
}

create_issue_comment() {
    local issue="${1}"
    local component line message rule severity type issue_key file_path rule_details_file rule_name rule_description clean_description
    local comment_body existing_comment base_sha head_sha start_sha position_body response_file http_code

    component=$(jq -r '.component' <<<"${issue}")
    line=$(jq -r '.line // empty' <<<"${issue}")
    message=$(jq -r '.message' <<<"${issue}")
    rule=$(jq -r '.rule' <<<"${issue}")
    severity=$(jq -r '.severity' <<<"${issue}")
    type=$(jq -r '.type' <<<"${issue}")
    issue_key=$(jq -r '.key' <<<"${issue}")

    file_path=$(extract_file_path "${component}")
    log_debug "Processing: ${file_path}:${line}"

    if [[ -z "${line}" ]]; then
        log_info "Skipping issue without line number in ${file_path}"
        return
    fi

    existing_comment=$(check_existing_comment "${file_path}" "${line}" "${rule}")
    if [[ -n "${existing_comment}" ]]; then
        log_info "Comment already exists for ${file_path}:${line}"
        return
    fi

    rule_details_file="rule_${rule//:/_}.json"
    if [[ ! -f "${rule_details_file}" ]]; then
        fetch_data "${sonar_host}/api/rules/show?key=${rule}" "${rule_details_file}" "Authorization: Bearer ${sonar_token}"
    fi

    rule_name=$(jq -r '.rule.name // empty' "${rule_details_file}" 2>/dev/null || echo "")
    rule_description=$(jq -r '.rule.htmlDesc // .rule.mdDesc // empty' "${rule_details_file}" 2>/dev/null || echo "")

    comment_body="**SonarQube Issue: ${rule_name:-${rule}}**

**Severity:** ${severity} | **Type:** ${type}

**Message:** ${message}
"

    if [[ -n "${rule_description}" ]]; then
        clean_description=$(echo "${rule_description}" | sed 's/<[^>]*>//g' | head -c 500)
        comment_body+="
**Description:** ${clean_description}...
"
    fi

    comment_body+="
[View Issue in SonarQube](${sonar_host}/project/issues?pullRequest=${gl_mr_iid}&issues=${issue_key}&open=${issue_key}&id=${sonar_project_key}) | [View Rule Details](${sonar_host}/coding_rules?open=${rule}&rule_key=${rule})"

    base_sha=$(jq -r '.diff_refs.base_sha' "${MR_CHANGES_FILE}")
    head_sha=$(jq -r '.diff_refs.head_sha' "${MR_CHANGES_FILE}")
    start_sha=$(jq -r '.diff_refs.start_sha' "${MR_CHANGES_FILE}")

    position_body=$(jq -c -n \
        --arg base_sha "${base_sha}" \
        --arg head_sha "${head_sha}" \
        --arg start_sha "${start_sha}" \
        --arg new_path "${file_path}" \
        --arg old_path "${file_path}" \
        --arg new_line "${line}" \
        --arg body "${comment_body}" \
        '{
            body: $body,
            position: {
                base_sha: $base_sha,
                head_sha: $head_sha,
                start_sha: $start_sha,
                position_type: "text",
                new_path: $new_path,
                old_path: $old_path,
                new_line: ($new_line | tonumber)
            }
        }')

    log "${COLOR_BLUE}" "Creating comment for ${file_path}:${line} - ${message}"

    response_file=$(mktemp)
    http_code=$(wget --header "PRIVATE-TOKEN: ${gl_token}" \
        --header "Content-Type: application/json" \
        --method POST \
        --body-data "${position_body}" \
        "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/discussions" \
        --server-response -O "${response_file}" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')

    if [[ "${http_code}" == "201" ]]; then
        log_success "✓ Successfully created comment for ${file_path}:${line}"
    else
        log_error "✗ Failed to create comment for ${file_path}:${line} (HTTP ${http_code})"
        if [[ -s "${response_file}" ]]; then
            log_error "Response: $(cat "${response_file}")"
        fi
    fi

    rm -f "${response_file}"
    sleep 0.5
}

resolve_fixed_issues() {
    log_info "Resolving fixed SonarQube issues..."
    local resolved_count=0
    
    jq -r '.[] | select(.notes[0].body | contains("SonarQube Issue:")) | .id' "${DISCUSSIONS_FILE}" | \
    while read -r discussion_id; do
        if [[ -n "${discussion_id}" ]]; then
            local discussion_file_path discussion_line discussion_rule issue_still_exists
            
            # Extract file path, line, and rule from the discussion
            discussion_file_path=$(jq -r --arg did "${discussion_id}" '.[] | select(.id == $did) | .notes[0].position.new_path // .notes[0].position.old_path // empty' "${DISCUSSIONS_FILE}")
            discussion_line=$(jq -r --arg did "${discussion_id}" '.[] | select(.id == $did) | .notes[0].position.new_line // .notes[0].position.old_line // empty' "${DISCUSSIONS_FILE}")
            
            # Extract rule from the "View Rule Details" link in the comment body
            discussion_rule=$(jq -r --arg did "${discussion_id}" '.[] | select(.id == $did) | .notes[0].body' "${DISCUSSIONS_FILE}" | grep -oP 'rule_key=\K[^)]+' || echo "")
            
            if [[ -z "${discussion_file_path}" || -z "${discussion_line}" || -z "${discussion_rule}" ]]; then
                log_debug "Skipping discussion ${discussion_id}: missing file path, line, or rule"
                continue
            fi
            
            log_debug "Checking if issue still exists: ${discussion_file_path}:${discussion_line} (${discussion_rule})"
            
            # Check if this issue still exists in the current SonarQube report
            # Match by rule and line number, and check if the component path ends with the file path
            issue_still_exists=$(jq -r --arg rule "${discussion_rule}" --arg line "${discussion_line}" --arg file "${discussion_file_path}" \
                '.issues[] | 
                 select(.rule == $rule) | 
                 select((.line | tostring) == $line) |
                 select(.component | endswith($file)) |
                 .key' "${ISSUES_FILE}" | head -1)
            
            if [[ -z "${issue_still_exists}" ]]; then
                log_success "Resolving fixed issue: ${discussion_file_path}:${discussion_line} (${discussion_rule})"
                resolve_discussion "${discussion_id}"
                resolved_count=$((resolved_count + 1))
            else
                log_debug "Issue still exists: ${discussion_file_path}:${discussion_line}"
            fi
        fi
    done
    
    if [[ ${resolved_count} -gt 0 ]]; then
        log_success "Resolved ${resolved_count} fixed issue(s)"
    else
        log_info "No fixed issues to resolve"
    fi
}

post_sonar_issues() {
    local issue_count
    log_info "Fetching individual SonarQube issues..."
    fetch_data "${sonar_host}/api/issues/search?componentKeys=${sonar_project_key}&pullRequest=${gl_mr_iid}&resolved=false&statuses=OPEN,CONFIRMED,REOPENED" \
        "${ISSUES_FILE}" "Authorization: Bearer ${sonar_token}"
    issue_count=$(jq '.issues | length' "${ISSUES_FILE}")
    log_info "Found ${issue_count} SonarQube issues"
    fetch_data "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/changes" \
        "${MR_CHANGES_FILE}" "PRIVATE-TOKEN: ${gl_token}"
    jq -c '.issues[]' "${ISSUES_FILE}" | while read -r issue; do
        create_issue_comment "${issue}"
    done
    log_success "Finished posting individual SonarQube issues"
    
    # Resolve discussions for issues that have been fixed
    resolve_fixed_issues
    
    echo "${issue_count}"
}

post_summary_discussion() {
    local summary_body="${1}"
    local body unresolve_body
    body=$(jq -c -n --arg 'body' "${summary_body}" '{body: $body}')
    if [[ -n "${summary_discussion_id}" ]]; then
        log_info "Updating existing SonarQube summary discussion..."
        wget --header "PRIVATE-TOKEN: ${gl_token}" \
            --header "Content-Type: application/json" \
            --method PUT \
            --body-data "${body}" \
            "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/discussions/${summary_discussion_id}/notes/${summary_note_id}" \
            -q -O /dev/null
        unresolve_body=$(jq -c -n '{resolved: false}')
        wget --header "PRIVATE-TOKEN: ${gl_token}" \
            --header "Content-Type: application/json" \
            --method PUT \
            --body-data "${unresolve_body}" \
            "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/discussions/${summary_discussion_id}" \
            -q -O /dev/null
    else
        log_info "Creating new SonarQube summary discussion..."
        wget --header "PRIVATE-TOKEN: ${gl_token}" \
            --header "Content-Type: application/json" \
            --method POST \
            --body-data "${body}" \
            "${gl_url}/api/v4/projects/${gl_id}/merge_requests/${gl_mr_iid}/discussions" \
            -q -O /dev/null
    fi
}

cleanup_temp_files() {
    log_debug "Cleaning up temporary files..."
    rm -f "${STATUS_FILE}" "${DISCUSSIONS_FILE}" "${ISSUES_FILE}" "${MEASURES_FILE}" "${MR_CHANGES_FILE}"
    rm -f rule_*.json
}

# Main execution
main() {
    local coverage duplication issue_count summary_body
    
    # Clean up any stale files from previous runs
    cleanup_temp_files
    
    init_config
    fetch_quality_gate_status
    fetch_discussions
    if [[ "${quality_gate_status}" == "OK" ]]; then
        handle_quality_gate_pass
        exit 0
    fi
    log_info "Fetching SonarQube metrics..."
    read -r coverage duplication < <(fetch_sonar_metrics)
    issue_count=$(post_sonar_issues)
    
    # Re-fetch discussions after posting issues to get the latest summary_discussion_id
    fetch_discussions
    
    summary_body=$(generate_summary_comment "${issue_count}" "${coverage}" "${duplication}")
    post_summary_discussion "${summary_body}"
    log_success "SonarQube analysis complete!"
}

main "$@"
