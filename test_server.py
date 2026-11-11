import copy
import tempfile
import unittest
from pathlib import Path
from server import create_app


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'test.sqlite3'
        self.app = create_app(self.path)
        self.app.testing = True
        self.client = self.app.test_client()
        self.state = self.client.get('/api/state').get_json()

    def tearDown(self):
        self.temp.cleanup()

    def test_persists_after_app_restart(self):
        self.state['settings']['tariff'] = 9.5
        self.assertEqual(self.client.put('/api/state', json=self.state).status_code, 200)
        other = create_app(self.path).test_client()
        self.assertEqual(other.get('/api/state').get_json()['settings']['tariff'], 9.5)

    def test_invalid_write_does_not_replace_data(self):
        bad = copy.deepcopy(self.state)
        bad['readings'].append(copy.deepcopy(bad['readings'][0]))
        self.assertEqual(self.client.put('/api/state', json=bad).status_code, 400)
        self.assertEqual(self.client.get('/api/state').get_json(), self.state)

    def test_decreasing_reading_is_retained_for_review(self):
        self.state['readings'][-1]['value'] = 0
        self.assertEqual(self.client.put('/api/state', json=self.state).status_code, 200)

    def test_foreign_origin_write_is_rejected(self):
        self.assertEqual(self.client.put('/api/state', json=self.state, headers={'Origin': 'https://foreign.example'}).status_code, 403)

    def test_html_and_server_config_load(self):
        with self.client.get('/') as response:
            self.assertEqual(response.status_code, 200)
        self.assertIn(b'backend:true', self.client.get('/config.js').data)

    def test_private_files_are_not_served(self):
        for path in ['/server.py', '/workspace.sqlite3', '/.env', '/../../etc/passwd']:
            self.assertEqual(self.client.get(path).status_code, 404)

    def test_invalid_json_and_numeric_bounds(self):
        self.assertEqual(self.client.put('/api/state', data='bad', content_type='application/json').status_code, 400)
        self.state['settings']['target'] = 0
        self.assertEqual(self.client.put('/api/state', json=self.state).status_code, 400)


if __name__ == '__main__':
    unittest.main()
