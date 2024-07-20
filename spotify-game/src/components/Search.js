// src/components/Search.js
import React, { useState } from 'react';

const Search = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        placeholder="Search for an artist"
      />
      <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
        Search
      </button>
    </form>
  );
};

export default Search;
