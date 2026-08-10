from unittest.mock import MagicMock

import rate_limit
from rate_limit import MAX_REQUESTS_PER_WINDOW, check_and_increment, get_client_ip


def setup_function(_):
    # Each test gets a clean counter state — rate_limit._requests is a
    # process-wide dict, so tests would otherwise leak state into each other.
    rate_limit._requests.clear()


def test_get_client_ip_prefers_x_forwarded_for():
    request = MagicMock()
    request.headers = {"x-forwarded-for": "203.0.113.5, 10.0.0.1"}
    request.client.host = "10.0.0.1"
    assert get_client_ip(request) == "203.0.113.5"


def test_get_client_ip_falls_back_to_connection_ip_when_no_header():
    request = MagicMock()
    request.headers = {}
    request.client.host = "192.168.1.1"
    assert get_client_ip(request) == "192.168.1.1"


def test_under_limit_requests_pass():
    ip = "1.2.3.4"
    for _ in range(MAX_REQUESTS_PER_WINDOW):
        assert check_and_increment(ip) is True


def test_over_limit_request_is_rejected():
    ip = "1.2.3.4"
    for _ in range(MAX_REQUESTS_PER_WINDOW):
        assert check_and_increment(ip) is True
    assert check_and_increment(ip) is False


def test_different_ips_have_independent_counters():
    for _ in range(MAX_REQUESTS_PER_WINDOW):
        assert check_and_increment("1.1.1.1") is True
    # A different IP starts fresh — not affected by 1.1.1.1's usage.
    assert check_and_increment("2.2.2.2") is True


def test_counter_resets_after_window_expires(monkeypatch):
    ip = "1.2.3.4"
    fake_now = [1_000_000.0]
    monkeypatch.setattr(rate_limit.time, "time", lambda: fake_now[0])

    for _ in range(MAX_REQUESTS_PER_WINDOW):
        assert check_and_increment(ip) is True
    assert check_and_increment(ip) is False

    # Advance past the 24h rolling window — the old timestamps should be
    # pruned and the IP should be allowed again.
    fake_now[0] += rate_limit._WINDOW_SECONDS + 1
    assert check_and_increment(ip) is True
