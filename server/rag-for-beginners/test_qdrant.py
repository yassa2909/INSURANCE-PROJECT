import random

from qdrant_client import QdrantClient
from qdrant_client.http import models


def build_vector(seed: int, size: int = 384) -> list[float]:
	"""Build a deterministic sample vector of the required size."""
	rng = random.Random(seed)
	return [rng.random() for _ in range(size)]


def main() -> None:
	# 1. Initialize Qdrant locally using file-based storage.
	client = QdrantClient(path="./qdrant_data")

	collection_name = "my_collection"
	vector_size = 384

	try:
		# 2. Create or recreate the collection with cosine distance.
		if client.collection_exists(collection_name):
			client.delete_collection(collection_name=collection_name)

		client.create_collection(
			collection_name=collection_name,
			vectors_config=models.VectorParams(
				size=vector_size,
				distance=models.Distance.COSINE,
			),
		)

		print(f"Collection '{collection_name}' created successfully.")

		# 3. Insert at least 5 sample vectors with payload text.
		points = []
		sample_vectors = []

		for i in range(1, 6):
			vector = build_vector(seed=i, size=vector_size)
			sample_vectors.append(vector)

			points.append(
				models.PointStruct(
					id=i,
					vector=vector,
					payload={"text": f"sample {i}"},
				)
			)

		client.upsert(
			collection_name=collection_name,
			points=points,
		)

		print("Inserted 5 sample vectors.")

		# 4. Perform a similarity search using one inserted vector as the query.
		query_vector = sample_vectors[0]
		search_results = client.query_points(
			collection_name=collection_name,
			query=query_vector,
			limit=3,
		).points

		# 5. Print the search results clearly.
		print("\nTop 3 similarity search results:")
		for rank, result in enumerate(search_results, start=1):
			print(f"\nResult {rank}")
			print(f"  ID: {result.id}")
			print(f"  Score: {result.score}")
			print(f"  Payload: {result.payload}")

	finally:
		# 6. Properly close the Qdrant client.
		client.close()


if __name__ == "__main__":
	main()