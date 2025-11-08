"use client";
import { useState } from 'react';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/app/api/firebase';
import Sidebar from '@/app/components/sidebar';
import Navbar from '@/app/components/navbar';

export default function HeadAdmin() {
	const auth = getAuth(app);
	const db = getFirestore(app);

	const [form, setForm] = useState({ name: '', shortName: '', description: '', domain: '', initUsers: false, initProjects: false, initMeetings: false });
	const [creating, setCreating] = useState(false);
	const [createdOrg, setCreatedOrg] = useState(null);
	const [error, setError] = useState(null);

	onAuthStateChanged(auth, (u) => {
		// optional: could restrict this page
		if (u) console.log('Head admin user:', u.email);
	});

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
	};

	const handleCreateOrg = async (e) => {
		e.preventDefault();
		setCreating(true);
		setError(null);
		try {
			const orgRef = await addDoc(collection(db, 'organizations'), {
				name: form.name,
                shortName: form.shortName,
				description: form.description || '',
				domain: form.domain || '',
				createdAt: new Date().toISOString()
			});

			// optionally initialize subcollections with a sample doc
			if (form.initUsers) {
				await addDoc(collection(db, `organizations/${orgRef.id}/users`), {
					
				});
			}
			if (form.initProjects) {
				await addDoc(collection(db, `organizations/${orgRef.id}/projects`), {
					
				});
			}
			if (form.initMeetings) {
				await addDoc(collection(db, `organizations/${orgRef.id}/meetings`), {
					
				});
			}

			setCreatedOrg({ id: orgRef.id, ...form });
			setForm({ name: '', shortName: '', description: '', domain: '', initUsers: false, initProjects: false, initMeetings: false });
		} catch (err) {
			console.error('Error creating organization:', err);
			setError(err.message || String(err));
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="flex">
			<Sidebar />
			<div className="flex-1">
				<Navbar />
				<div className="p-6">
					<h1 className="text-2xl font-bold mb-4">Create Organization</h1>

					<div className="bg-white rounded-lg shadow p-6 max-w-xl">
						<form onSubmit={handleCreateOrg}>
							<div className="mb-3">
								<label className="block text-sm font-medium text-gray-700">Organization name</label>
								<input name="name" value={form.name} onChange={handleChange} required className="mt-1 block w-full border rounded-md shadow-sm p-2" />
							</div>
                            <div className="mb-3">
								<label className="block text-sm font-medium text-gray-700">Short name</label>
								<input name="shortName" value={form.shortName} onChange={handleChange} required className="mt-1 block w-full border rounded-md shadow-sm p-2" />
							</div>
							<div className="mb-3">
								<label className="block text-sm font-medium text-gray-700">Domain (optional)</label>
								<input name="domain" value={form.domain} onChange={handleChange} className="mt-1 block w-full border rounded-md shadow-sm p-2" />
							</div>
							<div className="mb-3">
								<label className="block text-sm font-medium text-gray-700">Description</label>
								<textarea name="description" value={form.description} onChange={handleChange} className="mt-1 block w-full border rounded-md shadow-sm p-2" />
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">Initialize subcollections</label>
								<div className="flex gap-4 items-center">
									<label className="inline-flex items-center"><input type="checkbox" name="initUsers" checked={form.initUsers} onChange={handleChange} className="mr-2" />Users</label>
									<label className="inline-flex items-center"><input type="checkbox" name="initProjects" checked={form.initProjects} onChange={handleChange} className="mr-2" />Projects</label>
									<label className="inline-flex items-center"><input type="checkbox" name="initMeetings" checked={form.initMeetings} onChange={handleChange} className="mr-2" />Meetings</label>
								</div>
							</div>

							{error && <div className="text-red-600 mb-3">{error}</div>}

							<div className="flex justify-end gap-2">
								<button type="submit" disabled={creating} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">{creating ? 'Creating...' : 'Create Organization'}</button>
							</div>
						</form>
						{createdOrg && (
							<div className="mt-4 p-3 bg-green-50 rounded">
								<div className="font-medium">Organization created</div>
								<div>ID: <code className="text-sm">{createdOrg.id}</code></div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

