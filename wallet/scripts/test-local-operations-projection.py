import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('projection', Path(__file__).with_name('capture-local-operations-manifest.py'))
projection = importlib.util.module_from_spec(spec); spec.loader.exec_module(projection)


class ProjectionTests(unittest.TestCase):
    def test_only_four_remote_budget_fields(self):
        remote = {k: n for k, n in zip(projection.LIMIT_FIELDS, (20, 300, 1000000, 5000))}
        remote.update(password='SECRET_FIXTURE', headers={'authorization': 'SECRET_FIXTURE'}, command='postgres://user:SECRET_FIXTURE@host')
        output = projection.safe_service_limits(remote)
        self.assertEqual(set(output), set(projection.LIMIT_FIELDS)); self.assertNotIn('SECRET_FIXTURE', json.dumps(output))
        remote['maxQueryDepth'] = 99; self.assertEqual(output['maxQueryDepth'], 20)

    def test_mistyped_remote_limit_is_never_published(self):
        for wrong in (True, 'SECRET_FIXTURE', None, -1, 0.5, 2147483648):
            value = {k: 1 for k in projection.LIMIT_FIELDS}; value['maxQueryNodes'] = wrong
            with self.assertRaises(ValueError): projection.safe_service_limits(value)

    def test_only_exact_independent_reviewed_endpoints(self):
        self.assertEqual(projection.safe_endpoints(projection.PUBLIC_ENDPOINTS), projection.PUBLIC_ENDPOINTS)
        for key in projection.PUBLIC_ENDPOINTS:
            bad = dict(projection.PUBLIC_ENDPOINTS); bad[key] = 'https://user:SECRET_FIXTURE@127.0.0.1:39600/graphql'
            with self.assertRaises(ValueError): projection.safe_endpoints(bad)
        with self.assertRaises(ValueError): projection.safe_endpoints({**projection.PUBLIC_ENDPOINTS, 'token': 'SECRET_FIXTURE'})

    def test_missing_and_non_dictionary_inputs_refused(self):
        for value in (None, [], {}, 'SECRET_FIXTURE'):
            with self.assertRaises(ValueError): projection.safe_endpoints(value)
            with self.assertRaises(ValueError): projection.safe_service_limits(value)

    def test_projection_is_detached(self):
        endpoints = projection.safe_endpoints(projection.PUBLIC_ENDPOINTS); endpoints.clear()
        self.assertEqual(len(projection.PUBLIC_ENDPOINTS), 4)


if __name__ == '__main__': unittest.main()
